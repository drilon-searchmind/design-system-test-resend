/**
 * @param {string} body
 * @param {{ firstName?: string; accountManager?: string; clientName?: string }} vars
 */
export function renderNpsTemplateText(body, vars = {}) {
  const firstName = vars.firstName ?? "";
  const accountManager = vars.accountManager ?? "";
  const clientName = vars.clientName ?? "";
  return String(body ?? "")
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{accountManager\}\}/g, accountManager)
    .replace(/\{\{clientName\}\}/g, clientName);
}

/**
 * @param {string} text
 */
export function npsTemplateTextToHtml(text) {
  const escaped = String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${escaped.replace(/\n/g, "<br>")}</div>`;
}
