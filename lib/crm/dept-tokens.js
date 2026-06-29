/** Maps department id → CSS variable name (DESIGN-SEARCHMINDOS § dept hues). */

/** @type {Record<string, string>} */
export const AGENCY_DEP_CSS_VARS = {
  seo: "--agency-dep-seo",
  ppc: "--agency-dep-ppc",
  social: "--agency-dep-social",
  email: "--agency-dep-email",
  geo: "--agency-dep-geo",
  creative: "--agency-dep-creative",
  content: "--agency-dep-content",
  martech: "--agency-dep-martech",
  web: "--agency-dep-web",
  cro: "--agency-dep-cro",
};

/**
 * @param {string} deptId
 */
export function agencyDeptColor(deptId) {
  const v = AGENCY_DEP_CSS_VARS[deptId];
  return v ? `var(${v})` : "var(--agency-dep-seo)";
}
