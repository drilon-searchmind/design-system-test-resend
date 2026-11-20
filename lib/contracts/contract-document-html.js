/**
 * Printbart kontraktdokument (HTML → "Gem som PDF" i browseren), inkl. underskriftsoplysninger.
 * Bruges både til signerede kontrakter og til live-preview i send-dialogen.
 */

/** @param {unknown} s */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} s */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
}

/**
 * Minimal markdown → HTML (overskrifter, lister, afsnit, fed/kursiv).
 * @param {string} md
 */
export function markdownToHtml(md) {
  const lines = String(md ?? "").replace(/\r\n/g, "\n").split("\n");
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  let para = [];
  let listOpen = false;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br/>")}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushPara();
      closeList();
    } else if (h) {
      flushPara();
      closeList();
      const level = Math.min(h[1].length + 1, 5);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else if (li) {
      flushPara();
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("\n");
}

/** @param {unknown} v */
function fmtDateTime(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.toLocaleString("da-DK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Copenhagen" })}`;
}

/** Searchmind 1337 OS lagdelt mærke (samme form som i appen), i brandfarver. */
const LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true"><rect x="16" y="16" width="44" height="44" rx="10" fill="#bbcbff"/><rect x="28" y="28" width="44" height="44" rx="10" fill="#8a9ff0"/><rect x="40" y="40" width="44" height="44" rx="10" fill="#4a5ce0"/></svg>`;

/**
 * @param {{
 *   title: string;
 *   clientName?: string;
 *   bodyMd: string;
 *   signature?: {
 *     name?: string; email?: string; title?: string; company?: string; signedAt?: unknown;
 *     ip?: string; hash?: string;
 *   } | null;
 *   autoPrint?: boolean;
 *   watermark?: string;
 * }} input
 */
export function renderContractDocumentHtml(input) {
  const sig = input.signature;
  const signed = Boolean(sig && (sig.name || sig.signedAt));
  /** @type {Array<[string, string, boolean?]>} */
  const sigRows =
    signed && sig ?
      [
        ["Underskrevet af", String(sig.name ?? "")],
        ["Titel", String(sig.title ?? "")],
        ["Virksomhed", String(sig.company ?? "")],
        ["E-mail", String(sig.email ?? "")],
        ["Tidspunkt", fmtDateTime(sig.signedAt)],
        ["IP-adresse", String(sig.ip ?? "")],
        ["Dokument-hash (SHA-256)", String(sig.hash ?? ""), true],
      ]
    : [];
  const sigBlock =
    signed ?
      `<section class="sig">
  <div class="sig-head"><h3>Underskrift</h3><span class="chip chip-ok">Underskrevet</span></div>
  <dl>
    ${sigRows
      .filter(([, v]) => v)
      .map(([k, v, mono]) => `<div><dt>${esc(k)}</dt><dd${mono ? ' class="mono"' : ""}>${esc(v)}</dd></div>`)
      .join("\n    ")}
  </dl>
  <p class="muted">Simpel elektronisk underskrift (eIDAS SES).</p>
</section>`
    : `<section class="sig">
  <div class="sig-head"><h3>Underskrift</h3><span class="chip chip-warn">Afventer underskrift</span></div>
  <p class="muted">Dokumentet er endnu ikke underskrevet.</p>
</section>`;

  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(input.title)}</title>
<style>
  :root {
    --brand: oklch(54% 0.20 272); --brand-soft: oklch(95% 0.03 272); --brand-border: oklch(88% 0.06 272);
    --text: oklch(22% 0.015 265); --muted: oklch(48% 0.015 265); --faint: oklch(62% 0.012 260);
    --border: oklch(91% 0.006 260); --sunken: oklch(97% 0.004 260);
    --ok: oklch(58% 0.14 155); --ok-soft: oklch(94% 0.03 155);
    --warn: oklch(55% 0.14 75); --warn-soft: oklch(96% 0.04 75);
  }
  @page { size: A4; margin: 20mm 18mm 22mm;
    @bottom-left { content: "Searchmind 1337 OS"; font: 8pt "Geist", "Segoe UI", Helvetica, Arial, sans-serif; color: #82868e; }
    @bottom-right { content: "Side " counter(page) " af " counter(pages); font: 8pt "Geist", "Segoe UI", Helvetica, Arial, sans-serif; color: #82868e; }
  }
  * { box-sizing: border-box; }
  html { background: var(--sunken); }
  body { font-family: "Geist", "Segoe UI", -apple-system, Helvetica, Arial, sans-serif; color: var(--text); line-height: 1.6; font-size: 12.5px; margin: 0 auto; padding: 0; max-width: 794px; position: relative; -webkit-font-smoothing: antialiased; }
  .page { background: #fff; padding: 44px 52px 52px; margin: 24px auto; border: 1px solid var(--border); border-radius: 10px; }
  .brandbar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid var(--border); margin-bottom: 30px; }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 13px; letter-spacing: -0.01em; }
  .brand small { display: block; font-weight: 500; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); line-height: 1.2; }
  .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand); margin: 0 0 8px; }
  h1 { font-size: 28px; line-height: 1.15; letter-spacing: -0.02em; font-weight: 600; margin: 0 0 18px; }
  h2,h3,h4,h5 { margin: 24px 0 6px; letter-spacing: -0.01em; font-weight: 600; line-height: 1.3; break-after: avoid; }
  h2 { font-size: 15px; padding-top: 16px; border-top: 1px solid var(--border); }
  h3 { font-size: 13.5px; } h4,h5 { font-size: 12.5px; color: var(--muted); }
  p { margin: 0 0 9px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 28px; background: var(--sunken); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; }
  .meta div { min-width: 120px; }
  .meta dt { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
  .meta dd { margin: 2px 0 0; font-weight: 600; font-size: 13px; }
  .chip { display: inline-block; font-size: 10.5px; font-weight: 600; line-height: 1; padding: 5px 9px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
  .chip-ok { background: var(--ok-soft); color: var(--ok); border-color: oklch(82% 0.06 155); }
  .chip-warn { background: var(--warn-soft); color: var(--warn); border-color: oklch(88% 0.07 75); }
  ul { padding-left: 0; list-style: none; margin: 0 0 10px; }
  li { position: relative; padding-left: 18px; margin: 3px 0; }
  li::before { content: ""; position: absolute; left: 4px; top: 0.62em; width: 5px; height: 5px; border-radius: 50%; background: var(--brand); }
  strong { font-weight: 600; }
  .sig { margin-top: 36px; background: var(--sunken); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; break-inside: avoid; }
  .sig-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .sig h3 { margin: 0; font-size: 14px; }
  .sig dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
  .sig dl div { min-width: 0; }
  .sig dt { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
  .sig dd { margin: 2px 0 0; font-weight: 500; overflow-wrap: anywhere; }
  .sig dd.mono, .sig dl div:has(.mono) { grid-column: 1 / -1; }
  .mono { font-family: "Geist Mono", ui-monospace, Consolas, monospace; font-size: 10px; word-break: break-all; font-weight: 400; }
  .muted { color: var(--muted); font-size: 11px; margin: 12px 0 0; }
  .wm { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 80px; font-weight: 700; color: rgba(74,92,224,0.07); transform: rotate(-20deg); pointer-events: none; }
  .noprint { position: fixed; top: 12px; right: 12px; z-index: 5; }
  .noprint button { padding: 8px 14px; border: 1px solid var(--brand); background: var(--brand); color: #fff; border-radius: 8px; cursor: pointer; font: 600 12px inherit; font-family: inherit; }
  .noprint button:hover { background: oklch(48% 0.22 272); }
  @media (max-width: 640px) { .page { padding: 28px 20px 32px; margin: 0; border-radius: 0; border-inline: 0; } h1 { font-size: 23px; } .sig dl { grid-template-columns: 1fr; } }
  @media print { html { background: #fff; } body { max-width: none; } .page { margin: 0; padding: 0; border: 0; border-radius: 0; } .noprint { display: none; } .wm { color: rgba(74,92,224,0.06); } }
</style></head>
<body>
${input.autoPrint ? "" : `<div class="noprint"><button onclick="window.print()">Gem som PDF</button></div>`}
${input.watermark ? `<div class="wm">${esc(input.watermark)}</div>` : ""}
<main class="page">
<header class="brandbar"><div class="brand">${LOGO_SVG}<span>Searchmind<small>1337 OS</small></span></div><span class="chip ${signed ? "chip-ok" : "chip-warn"}">${signed ? "Underskrevet" : "Afventer underskrift"}</span></header>
<p class="eyebrow">Aftale</p>
<h1>${esc(input.title)}</h1>
${input.clientName ? `<dl class="meta"><div><dt>Kunde</dt><dd>${esc(input.clientName)}</dd></div>${signed && sig?.signedAt ? `<div><dt>Underskrevet</dt><dd>${esc(fmtDateTime(sig.signedAt))}</dd></div>` : ""}</dl>` : ""}
${markdownToHtml(input.bodyMd)}
${sigBlock}
</main>
${input.autoPrint ? `<script>window.addEventListener("load",function(){window.print()})</script>` : ""}
</body></html>`;
}
