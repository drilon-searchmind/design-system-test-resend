/**
 * @param {unknown} value
 */
function escapeCsvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string[]} columns
 * @param {Record<string, string>[]} rows
 */
export function rowsToCsv(columns, rows) {
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) => columns.map((col) => escapeCsvCell(row[col] ?? "")).join(","));
  return [header, ...body].join("\r\n");
}

/**
 * Parse RFC 4180 CSV (handles quoted fields with commas and newlines).
 * @param {string} text
 * @returns {Record<string, string>[]}
 */
export function parseCsv(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      i += 1;
    } else if (ch === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  /** @type {Record<string, string>[]} */
  const out = [];

  for (let ri = 1; ri < rows.length; ri += 1) {
    const cells = rows[ri];
    if (cells.length === 1 && cells[0].trim() === "") continue;
    /** @type {Record<string, string>} */
    const record = {};
    for (let ci = 0; ci < headers.length; ci += 1) {
      record[headers[ci]] = cells[ci] ?? "";
    }
    out.push(record);
  }

  return out;
}
