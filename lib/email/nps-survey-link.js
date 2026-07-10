/**
 * Inject personal survey URL into NPS e-mail copy.
 * @param {string} body
 * @param {string} surveyUrl
 */
export function injectNpsSurveyLink(body, surveyUrl) {
  const url = String(surveyUrl ?? "").trim();
  if (!url) return String(body ?? "");

  return String(body ?? "")
    .replace(/\[ Klik her for at svare \]/gi, url)
    .replace(/\{\{surveyUrl\}\}/g, url);
}

const SURVEY_LINK_PLACEHOLDER = "___NPS_SURVEY_LINK___";

/**
 * @param {string} text
 * @param {string} [surveyUrl]
 */
export function npsSurveyTextToHtml(text, surveyUrl) {
  const url = String(surveyUrl ?? "").trim();
  let body = injectNpsSurveyLink(String(text ?? ""), url);

  if (url && body.includes(url)) {
    body = body.split(url).join(SURVEY_LINK_PLACEHOLDER);
  }

  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  if (!url) return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${escaped}</div>`;

  const safeHref = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const linked = escaped.replace(
    SURVEY_LINK_PLACEHOLDER,
    `<a href="${safeHref}" style="color:#2563eb;font-weight:600;text-decoration:underline">Klik her for at svare</a>`,
  );

  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${linked}</div>`;
}
