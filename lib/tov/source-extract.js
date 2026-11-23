import dns from "node:dns/promises";
import net from "node:net";

/** Per-file limit (PDFs). Stored via GridFS — not limited by Mongo's 16 MB BSON cap. */
export const TOV_MAX_FILE_BYTES = 40 * 1024 * 1024;
export const TOV_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** Cap across all sources for one client (multiple large PDFs). */
export const TOV_MAX_TOTAL_BYTES = 120 * 1024 * 1024;
export const TOV_MAX_SOURCES = 40;
const MAX_TEXT_CHARS = 60_000;

const TEXT_EXT = new Set(["txt", "md", "markdown", "eml", "csv", "json", "html", "htm", "rtf"]);
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const IMAGE_EXT = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

/** @param {string} name */
const extOf = (name) => (name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "");

/**
 * Classify an uploaded file and extract what the model needs.
 * @param {{ name: string; type: string; size: number; buffer: Buffer }} file
 * @returns {{ error: string } | { value: { mediaType: "pdf" | "image" | "text" | "html"; mimeType: string; text?: string; data?: Buffer } }}
 */
export function classifyUpload(file) {
  const ext = extOf(file.name);
  if (file.size > TOV_MAX_FILE_BYTES) {
    return { error: `${file.name}: filen er større end ${Math.round(TOV_MAX_FILE_BYTES / 1048576)} MB` };
  }
  if (file.type === "application/pdf" || ext === "pdf") {
    return { value: { mediaType: "pdf", mimeType: "application/pdf", data: file.buffer } };
  }
  const imageMime = IMAGE_MIME.has(file.type) ? file.type : IMAGE_EXT[/** @type {keyof typeof IMAGE_EXT} */ (ext)];
  if (imageMime) {
    if (file.size > TOV_MAX_IMAGE_BYTES) {
      return { error: `${file.name}: billeder må max være ${Math.round(TOV_MAX_IMAGE_BYTES / 1048576)} MB` };
    }
    return { value: { mediaType: "image", mimeType: imageMime, data: file.buffer } };
  }
  if (file.type.startsWith("text/") || TEXT_EXT.has(ext) || file.type === "message/rfc822") {
    const raw = file.buffer.toString("utf8");
    const isHtml = ext === "html" || ext === "htm" || file.type === "text/html";
    return {
      value: {
        mediaType: isHtml ? "html" : "text",
        mimeType: file.type || "text/plain",
        text: (isHtml ? htmlToText(raw) : raw).slice(0, MAX_TEXT_CHARS),
      },
    };
  }
  return {
    error: `${file.name}: filtypen understøttes ikke. Brug PDF, billede (png/jpg/gif/webp), .txt, .md, .eml, .csv, .json eller .html (Word/PowerPoint: gem som PDF).`,
  };
}

/* ------------------------------------------------------------------- HTML */

/** @param {string} s */
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** @param {string} html */
export function htmlToText(html) {
  const withoutBlocks = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withBreaks = withoutBlocks
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|header|footer|blockquote)>/gi, "\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n");
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

/* -------------------------------------------------------------------- URL */

/** @param {string} ip */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.");
}

/**
 * Only public http(s) hosts may be fetched (SSRF guard).
 * @param {string} rawUrl
 * @returns {Promise<URL>}
 */
async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Ugyldig URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Kun http/https-links understøttes");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Interne adresser er ikke tilladt");
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error("Kunne ikke finde domænet");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Interne adresser er ikke tilladt");
  return url;
}

/**
 * @param {string} rawUrl
 * @param {number} maxBytes
 * @returns {Promise<{ body: string; finalUrl: string; contentType: string }>}
 */
async function fetchPublicText(rawUrl, maxBytes) {
  let current = rawUrl;
  for (let hop = 0; hop < 4; hop += 1) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; CRM-TOV-Bot/1.0)", accept: "text/html,text/css,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location") ?? "", url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Siden svarede ${res.status}`);
    const reader = res.body?.getReader();
    const chunks = [];
    let total = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      chunks.push(value);
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
    return {
      body: Buffer.concat(chunks).toString("utf8"),
      finalUrl: url.toString(),
      contentType: res.headers.get("content-type") ?? "",
    };
  }
  throw new Error("For mange redirects");
}

/**
 * Collect font families and colours used by a page and its first stylesheets.
 * @param {string} html
 * @param {string} baseUrl
 */
async function collectDesignHints(html, baseUrl) {
  /** @type {string[]} */
  const cssChunks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  cssChunks.push(...[...html.matchAll(/style="([^"]*)"/gi)].map((m) => m[1]));

  const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
    .filter(Boolean)
    .map((h) => {
      try {
        return new URL(/** @type {string} */ (h), baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((h) => h && !/fonts\.googleapis\.com/.test(h))
    .slice(0, 3);
  const results = await Promise.allSettled(hrefs.map((h) => fetchPublicText(/** @type {string} */ (h), 400_000)));
  for (const r of results) if (r.status === "fulfilled") cssChunks.push(r.value.body);

  const googleFamilies = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'>\s]+)/gi)].flatMap((m) =>
    [...decodeEntities(m[1]).matchAll(/family=([^&:;]+)/g)].map((f) => decodeURIComponent(f[1]).replace(/\+/g, " ")),
  );

  const css = cssChunks.join("\n");
  /** @type {Map<string, number>} */
  const fonts = new Map();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
    const first = m[1].split(",")[0].replace(/["'!important]/g, "").trim();
    if (first && !/^(inherit|initial|unset|var\()/.test(first)) fonts.set(first, (fonts.get(first) ?? 0) + 1);
  }
  /** @type {Map<string, number>} */
  const colors = new Map();
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let hex = m[1].toLowerCase();
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    colors.set(`#${hex}`, (colors.get(`#${hex}`) ?? 0) + 1);
  }
  const top = (/** @type {Map<string, number>} */ map, n) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => `${k} (${v}x)`);

  const lines = [];
  if (googleFamilies.length) lines.push(`Google Fonts loaded: ${[...new Set(googleFamilies)].join(", ")}`);
  if (fonts.size) lines.push(`font-family used in CSS (by frequency): ${top(fonts, 6).join(", ")}`);
  if (colors.size) lines.push(`Hex colours used in CSS (by frequency): ${top(colors, 12).join(", ")}`);
  return lines.join("\n");
}

/**
 * Fetch a public web page and turn it into model-ready material.
 * @param {string} rawUrl
 * @returns {Promise<{ url: string; title: string; text: string; hints: string }>}
 */
export async function extractFromUrl(rawUrl) {
  const page = await fetchPublicText(rawUrl, 1_500_000);
  const html = page.body;
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  const description = decodeEntities(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? "",
  ).trim();
  const body = page.contentType.includes("html") || /<html|<body|<p[ >]/i.test(html) ? htmlToText(html) : html;
  const text = [title && `Title: ${title}`, description && `Meta description: ${description}`, body]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_TEXT_CHARS);
  if (text.trim().length < 80) throw new Error("Fandt næsten ingen tekst på siden (kræver den JavaScript?)");
  const hints = await collectDesignHints(html, page.finalUrl).catch(() => "");
  return { url: page.finalUrl, title: title || new URL(page.finalUrl).hostname, text, hints };
}
