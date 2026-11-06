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
  const sigBlock =
    sig && (sig.name || sig.signedAt) ?
      `<section class="sig">
  <h3>Underskrift</h3>
  <table>
    <tr><th>Underskrevet af</th><td>${esc(sig.name)}</td></tr>
    ${sig.title ? `<tr><th>Titel</th><td>${esc(sig.title)}</td></tr>` : ""}
    ${sig.company ? `<tr><th>Virksomhed</th><td>${esc(sig.company)}</td></tr>` : ""}
    <tr><th>E-mail</th><td>${esc(sig.email)}</td></tr>
    <tr><th>Tidspunkt</th><td>${esc(fmtDateTime(sig.signedAt))}</td></tr>
    ${sig.ip ? `<tr><th>IP-adresse</th><td>${esc(sig.ip)}</td></tr>` : ""}
    ${sig.hash ? `<tr><th>Dokument-hash (SHA-256)</th><td class="mono">${esc(sig.hash)}</td></tr>` : ""}
  </table>
  <p class="muted">Simpel elektronisk underskrift (eIDAS SES).</p>
</section>`
    : `<section class="sig"><h3>Underskrift</h3><p class="muted">Afventer underskrift.</p></section>`;

  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8"/>
<title>${esc(input.title)}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; line-height: 1.55; font-size: 12.5px; margin: 0; padding: 32px; max-width: 800px; margin-inline: auto; position: relative; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2,h3,h4,h5 { margin: 20px 0 6px; }
  h2 { font-size: 16px; } h3 { font-size: 14px; }
  .meta { color: #555; margin-bottom: 24px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  ul { padding-left: 20px; }
  .sig { margin-top: 36px; border-top: 2px solid #111; padding-top: 12px; page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; width: 34%; color: #555; font-weight: 500; padding: 4px 8px 4px 0; vertical-align: top; }
  td { padding: 4px 0; }
  .mono { font-family: ui-monospace, Consolas, monospace; font-size: 10.5px; word-break: break-all; }
  .muted { color: #666; font-size: 11px; }
  .wm { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 80px; color: rgba(0,0,0,0.06); transform: rotate(-20deg); pointer-events: none; }
  .noprint { position: fixed; top: 12px; right: 12px; }
  .noprint button { padding: 8px 14px; border: 1px solid #111; background: #111; color: #fff; border-radius: 8px; cursor: pointer; font-size: 12px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
</style></head>
<body>
${input.autoPrint ? "" : `<div class="noprint"><button onclick="window.print()">Gem som PDF</button></div>`}
${input.watermark ? `<div class="wm">${esc(input.watermark)}</div>` : ""}
<h1>${esc(input.title)}</h1>
<div class="meta">${input.clientName ? `${esc(input.clientName)}` : ""}</div>
${markdownToHtml(input.bodyMd)}
${sigBlock}
${input.autoPrint ? `<script>window.addEventListener("load",function(){window.print()})</script>` : ""}
</body></html>`;
}
