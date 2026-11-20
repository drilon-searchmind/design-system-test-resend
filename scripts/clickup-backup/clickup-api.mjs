/** Minimal ClickUp-klient med rate limit, retry og paginering. */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {{ token: string; rpm?: number; log?: (m: string) => void }} opts
 */
export function createClickUp({ token, rpm = 90, log = () => {} }) {
  const interval = 60000 / rpm;
  let nextSlot = 0;
  const stats = { requests: 0, retries: 0, errors: 0 };

  async function slot() {
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + interval;
    if (at > now) await sleep(at - now);
  }

  /**
   * @param {string} path  fx "/team" (v2) eller "/workspaces/1/docs" med v: 3
   * @param {{ v?: 2 | 3; query?: Record<string, string | number | boolean | undefined> }} [o]
   */
  async function get(path, { v = 2, query = {} } = {}) {
    const qs = new URLSearchParams();
    for (const [k, val] of Object.entries(query)) if (val !== undefined && val !== "") qs.set(k, String(val));
    const url = `https://api.clickup.com/api/v${v}${path}${qs.size ? `?${qs}` : ""}`;
    let lastErr;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await slot();
      stats.requests += 1;
      let res;
      try {
        res = await fetch(url, { headers: { Authorization: token, "Content-Type": "application/json" } });
      } catch (e) {
        lastErr = e;
        stats.retries += 1;
        await sleep(1500 * (attempt + 1));
        continue;
      }
      if (res.status === 429) {
        stats.retries += 1;
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        const wait = reset ? Math.max(2000, reset * 1000 - Date.now() + 500) : 30000;
        log(`Rate limit, venter ${Math.round(wait / 1000)} s`);
        nextSlot = Math.max(nextSlot, Date.now() + wait);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        stats.retries += 1;
        lastErr = new Error(`ClickUp ${res.status} på ${path}`);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        stats.errors += 1;
        const body = (await res.text()).slice(0, 200);
        const err = new Error(`ClickUp ${res.status} på ${path}: ${body}`);
        /** @type {any} */ (err).status = res.status;
        throw err;
      }
      return res.json();
    }
    stats.errors += 1;
    throw lastErr ?? new Error(`ClickUp-kald fejlede: ${path}`);
  }

  return { get, stats, rpm };
}

/** Kør fn over items med højst `n` samtidige kald (rate limit styres i klienten). */
export async function pool(items, n, fn, shouldStop = () => false) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length && !shouldStop()) {
      const idx = i;
      i += 1;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}
