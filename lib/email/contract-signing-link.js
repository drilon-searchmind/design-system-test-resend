/**
 * Inject personal signing URL / access code into contract e-mail copy.
 * @param {string} body
 * @param {{ signingUrl?: string; accessCode?: string }} vars
 */
export function injectContractSigningLink(body, vars = {}) {
  const url = String(vars.signingUrl ?? "").trim();
  const code = String(vars.accessCode ?? "").trim();
  let out = String(body ?? "");

  if (url) {
    out = out
      .replace(/\[ Klik her for at underskrive \]/gi, url)
      .replace(/\{\{signingUrl\}\}/g, url)
      .replace(/\{\{surveyUrl\}\}/g, url);
  }
  if (code) {
    out = out.replace(/\{\{accessCode\}\}/g, code);
  }
  return out;
}

const SIGNING_LINK_PLACEHOLDER = "___CONTRACT_SIGNING_LINK___";

/**
 * @param {string} text
 * @param {{ signingUrl?: string; accessCode?: string }} [vars]
 */
export function contractSigningTextToHtml(text, vars = {}) {
  const url = String(vars.signingUrl ?? "").trim();
  let body = injectContractSigningLink(String(text ?? ""), vars);

  if (url && body.includes(url)) {
    body = body.split(url).join(SIGNING_LINK_PLACEHOLDER);
  }

  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  if (!url) {
    return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${escaped}</div>`;
  }

  const safeHref = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const linked = escaped.replace(
    SIGNING_LINK_PLACEHOLDER,
    `<a href="${safeHref}" style="color:#2563eb;font-weight:600;text-decoration:underline">Klik her for at underskrive</a>`,
  );

  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${linked}</div>`;
}
