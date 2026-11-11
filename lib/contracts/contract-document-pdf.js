import PDFDocument from "pdfkit";

/**
 * Rigtig PDF-fil (A4) af et kontraktdokument: markdown-tekst + underskriftsblok.
 * Bruger pdfkit's indbyggede Helvetica (understøtter æ/ø/å).
 */

/** Skriv en linje med **fed** / *kursiv* som sammenhængende segmenter. */
/**
 * @param {InstanceType<typeof PDFDocument>} doc
 * @param {string} text
 * @param {{ size?: number; indent?: number; baseFont?: string; gap?: number }} [opts]
 */
function writeInline(doc, text, opts = {}) {
  const { size = 10.5, indent = 0, baseFont = "Helvetica", gap = 6 } = opts;
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
      margins: { top: 62, bottom: 62, left: 51, right: 51 },
      info: { Title: input.title, Producer: "Agency CRM" },
    });
    /** @type {Buffer[]} */
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#111").text(input.title);
    if (input.clientName) {
      doc.moveDown(0.2).font("Helvetica").fontSize(11).fillColor("#555").text(input.clientName);
    }
    doc.moveDown(0.6);
    const ruleY = doc.y;
    doc
      .moveTo(doc.page.margins.left, ruleY)
      .lineTo(doc.page.width - doc.page.margins.right, ruleY)
      .strokeColor("#ddd")
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8).fillColor("#111");

    const lines = String(input.bodyMd ?? "").replace(/\r\n/g, "\n").split("\n");
    /** @type {string[]} */
    let para = [];
    const flush = () => {
      if (para.length) {
        writeInline(doc, para.join(" "));
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
        const size = h[1].length <= 1 ? 15 : h[1].length === 2 ? 13 : 11.5;
        doc.moveDown(0.5);
        writeInline(doc, h[2], { size, baseFont: "Helvetica-Bold", gap: 4 });
      } else if (li) {
        flush();
        const y = doc.y;
        doc.font("Helvetica").fontSize(10.5).text("•", doc.page.margins.left + 4, y, { lineBreak: false });
        doc.y = y;
        writeInline(doc, li[1], { indent: 16, gap: 2 });
      } else {
        para.push(line);
      }
    }
    flush();

    // Underskriftsblok (holdes samlet på én side)
    const sig = input.signature;
    if (doc.y > doc.page.height - 230) doc.addPage();
    doc.moveDown(1.5);
    const sy = doc.y;
    doc
      .moveTo(doc.page.margins.left, sy)
      .lineTo(doc.page.width - doc.page.margins.right, sy)
      .strokeColor("#111")
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(0.6).font("Helvetica-Bold").fontSize(12).fillColor("#111").text("Underskrift");
    doc.moveDown(0.4);

    if (sig && (sig.name || sig.signedAt)) {
      /** @type {Array<[string, string | undefined, boolean?]>} */
      const rows = [
        ["Underskrevet af", sig.name],
        ["Titel", sig.title],
        ["Virksomhed", sig.company],
        ["E-mail", sig.email],
        ["Tidspunkt", fmtDateTime(sig.signedAt)],
        ["IP-adresse", sig.ip],
        ["Dokument-hash (SHA-256)", sig.hash, true],
      ];
      for (const [label, value, mono] of rows) {
        if (!value) continue;
        const y = doc.y;
        doc.font("Helvetica").fontSize(10).fillColor("#555").text(label, doc.page.margins.left, y, { width: 150 });
        const labelBottom = doc.y;
        doc
          .font(mono ? "Courier" : "Helvetica")
          .fontSize(mono ? 8 : 10)
          .fillColor("#111")
          .text(value, doc.page.margins.left + 160, y, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 160,
          });
        doc.y = Math.max(doc.y, labelBottom) + 3;
      }
      doc
        .moveDown(0.5)
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#666")
        .text("Simpel elektronisk underskrift (eIDAS SES).", doc.page.margins.left);
    } else {
      doc.font("Helvetica").fontSize(10).fillColor("#666").text("Afventer underskrift.");
    }

    doc.end();
  });
}
