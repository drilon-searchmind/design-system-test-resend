import PDFDocument from "pdfkit";

/** Searchmind 1337 OS-farver (hex-tilnærmelse af OKLCH-tokens i globals.css). */
const C = {
  brand: "#4a5ce0",
  brandMid: "#8a9ff0",
  brandLight: "#bbcbff",
  brandSoft: "#e7eeff",
  text: "#171b22",
  muted: "#595e66",
  faint: "#82868e",
  border: "#dfe1e5",
  sunken: "#f3f5f8",
  ok: "#0e9254",
  okSoft: "#dcf2e3",
  warn: "#9a6a00",
  warnSoft: "#ffefd5",
};

/**
 * Rigtig PDF-fil (A4) af et kontraktdokument: markdown-tekst + underskriftsblok.
 * Bruger pdfkit's indbyggede Helvetica (understøtter æ/ø/å).
 */

/** Skriv en linje med **fed** / *kursiv* som sammenhængende segmenter. */
/**
 * @param {InstanceType<typeof PDFDocument>} doc
 * @param {string} text
 * @param {{ size?: number; indent?: number; baseFont?: string; gap?: number; color?: string }} [opts]
 */
function writeInline(doc, text, opts = {}) {
  const { size = 10.5, indent = 0, baseFont = "Helvetica", gap = 6, color = C.text } = opts;
  const parts = [];
  const re = /\*\*(.+?)\*\*|(^|[^*])\*(?!\s)(.+?)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + (m[2] ? m[2].length : 0);
    if (start > last) parts.push({ t: text.slice(last, start), f: baseFont });
    if (m[1] !== undefined) parts.push({ t: m[1], f: "Helvetica-Bold" });
    else parts.push({ t: m[3], f: "Helvetica-Oblique" });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), f: baseFont });
  if (!parts.length) parts.push({ t: text, f: baseFont });

  parts.forEach((p, i) => {
    doc
      .font(p.f)
      .fontSize(size)
      .fillColor(color)
      .text(p.t, i === 0 ? doc.page.margins.left + indent : undefined, i === 0 ? undefined : undefined, {
        continued: i < parts.length - 1,
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - indent,
        lineGap: 2,
      });
  });
  doc.moveDown(gap / 10);
}

/** @param {unknown} v */
function fmtDateTime(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("da-DK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Copenhagen" });
}

/**
 * Statuschip (afrundet pille) tegnet ved (x, y); returnerer bredden.
 * @param {InstanceType<typeof PDFDocument>} doc
 */
function chip(doc, text, x, y, fg, bg) {
  doc.font("Helvetica-Bold").fontSize(8);
  const w = doc.widthOfString(text) + 16;
  doc.roundedRect(x, y, w, 17, 8.5).fill(bg);
  doc.fillColor(fg).text(text, x + 8, y + 5, { lineBreak: false });
  return w;
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
 * }} input
 * @returns {Promise<Buffer>}
 */
export function renderContractPdf(input) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 62, bottom: 66, left: 54, right: 54 },
      bufferPages: true,
      info: { Title: input.title, Producer: "Searchmind 1337 OS" },
    });
    /** @type {Buffer[]} */
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentW = right - left;
    const sig = input.signature;
    const signed = Boolean(sig && (sig.name || sig.signedAt));

    // Brandbar: lagdelt mærke + navn + statuschip
    const top = doc.page.margins.top - 14;
    doc.roundedRect(left, top, 12, 12, 3).fill(C.brandLight);
    doc.roundedRect(left + 4, top + 4, 12, 12, 3).fill(C.brandMid);
    doc.roundedRect(left + 8, top + 8, 12, 12, 3).fill(C.brand);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text).text("Searchmind", left + 30, top + 1, { lineBreak: false });
    doc.font("Helvetica").fontSize(7).fillColor(C.faint).text("1337 OS", left + 30, top + 14, { lineBreak: false, characterSpacing: 0.8 });
    const label = signed ? "Underskrevet" : "Afventer underskrift";
    doc.font("Helvetica-Bold").fontSize(8);
    const cw = doc.widthOfString(label) + 16;
    chip(doc, label, right - cw, top + 1, signed ? C.ok : C.warn, signed ? C.okSoft : C.warnSoft);
    doc.moveTo(left, top + 30).lineTo(right, top + 30).strokeColor(C.border).lineWidth(0.75).stroke();

    // Titelblok
    doc.x = left;
    doc.y = top + 52;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.brand).text("AFTALE", left, doc.y, { characterSpacing: 1.2 });
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(24).fillColor(C.text).text(input.title, left, doc.y, { width: contentW, lineGap: 1 });
    doc.moveDown(0.6);

    if (input.clientName) {
      const my = doc.y;
      doc.roundedRect(left, my, contentW, 42, 8).fillAndStroke(C.sunken, C.border);
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.faint).text("KUNDE", left + 14, my + 9, { characterSpacing: 0.9, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text).text(input.clientName, left + 14, my + 21, { width: contentW - 28, lineBreak: false, ellipsis: true });
      doc.x = left;
      doc.y = my + 42;
    }
    doc.moveDown(1.2);

    const lines = String(input.bodyMd ?? "").replace(/\r\n/g, "\n").split("\n");
    /** @type {string[]} */
    let para = [];
    const flush = () => {
      if (para.length) {
        writeInline(doc, para.join(" "), { size: 10, gap: 7 });
        para = [];
      }
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      const li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (!line.trim()) {
        flush();
      } else if (h) {
        flush();
        const level = h[1].length;
        const size = level <= 1 ? 14 : level === 2 ? 12.5 : 10.5;
        doc.moveDown(0.6);
        if (level <= 2) {
          if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
          const ry = doc.y;
          doc.moveTo(left, ry).lineTo(right, ry).strokeColor(C.border).lineWidth(0.75).stroke();
          doc.y = ry + 8;
        }
        writeInline(doc, h[2], { size, baseFont: "Helvetica-Bold", gap: 4, color: level > 2 ? C.muted : C.text });
      } else if (li) {
        flush();
        const y = doc.y;
        doc.circle(left + 6, y + 5.2, 2).fill(C.brand);
        doc.y = y;
        writeInline(doc, li[1], { size: 10, indent: 18, gap: 2 });
      } else {
        para.push(line);
      }
    }
    flush();

    // Underskriftskort (holdes samlet på én side)
    /** @type {Array<[string, string | undefined, boolean?]>} */
    const rows =
      signed && sig ?
        [
          ["UNDERSKREVET AF", sig.name],
          ["TITEL", sig.title],
          ["VIRKSOMHED", sig.company],
          ["E-MAIL", sig.email],
          ["TIDSPUNKT", fmtDateTime(sig.signedAt)],
          ["IP-ADRESSE", sig.ip],
          ["DOKUMENT-HASH (SHA-256)", sig.hash, true],
        ]
      : [];
    const shown = rows.filter(([, v]) => v);
    const gridRows = Math.ceil(shown.filter(([, , m]) => !m).length / 2);
    const hasHash = shown.some(([, , m]) => m);
    const cardH = 58 + (signed ? gridRows * 34 + (hasHash ? 34 : 0) + 22 : 24);
    if (doc.y + 30 + cardH > doc.page.height - doc.page.margins.bottom) doc.addPage();
    doc.moveDown(1.5);
    const cy = doc.y;
    doc.roundedRect(left, cy, contentW, cardH, 10).fillAndStroke(C.sunken, C.border);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.text).text("Underskrift", left + 18, cy + 16, { lineBreak: false });
    chip(doc, label, right - 18 - cw, cy + 14, signed ? C.ok : C.warn, signed ? C.okSoft : C.warnSoft);

    if (signed) {
      const colW = (contentW - 36 - 24) / 2;
      let gy = cy + 48;
      shown
        .filter(([, , m]) => !m)
        .forEach(([k, v], i) => {
          const gx = left + 18 + (i % 2) * (colW + 24);
          const ry = gy + Math.floor(i / 2) * 34;
          doc.font("Helvetica-Bold").fontSize(7).fillColor(C.faint).text(k, gx, ry, { width: colW, characterSpacing: 0.8, lineBreak: false });
          doc.font("Helvetica").fontSize(10).fillColor(C.text).text(String(v), gx, ry + 11, { width: colW, lineBreak: false, ellipsis: true });
        });
      gy += gridRows * 34;
      const hash = shown.find(([, , m]) => m);
      if (hash) {
        doc.font("Helvetica-Bold").fontSize(7).fillColor(C.faint).text(hash[0], left + 18, gy, { characterSpacing: 0.8, lineBreak: false });
        doc.font("Courier").fontSize(7.5).fillColor(C.text).text(String(hash[1]), left + 18, gy + 11, { width: contentW - 36 });
        gy += 34;
      }
      doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("Simpel elektronisk underskrift (eIDAS SES).", left + 18, gy + 2, { lineBreak: false });
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(C.muted).text("Dokumentet er endnu ikke underskrevet.", left + 18, cy + 44, { lineBreak: false });
    }

    // Sidefod på alle sider
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      const fy = doc.page.height - 40;
      doc.page.margins.bottom = 0;
      doc.moveTo(left, fy - 8).lineTo(right, fy - 8).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.font("Helvetica").fontSize(7.5).fillColor(C.faint);
      doc.text("Searchmind 1337 OS", left, fy, { lineBreak: false });
      doc.text(`Side ${i + 1} af ${range.count}`, left, fy, { width: contentW, align: "right", lineBreak: false });
    }

    doc.end();
  });
}
