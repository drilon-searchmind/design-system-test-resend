/**
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function renderContractTemplateText(template, vars) {
  let out = String(template ?? "");
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    out = out.replace(re, String(value ?? ""));
  }
  return out;
}
