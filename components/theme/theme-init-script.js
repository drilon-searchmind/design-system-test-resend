/**
 * Runs before interactive paint — density match localStorage (no flash).
 * Theme is always light (dark mode disabled).
 */

export function themeInitScriptInnerHtml() {
  return `(function(){try{document.documentElement.setAttribute('data-theme','light');var kd='apex-density',d=localStorage.getItem(kd);if(d==='spacious')document.documentElement.setAttribute('data-density','spacious');else document.documentElement.setAttribute('data-density','compact')}catch(_){document.documentElement.setAttribute('data-theme','light');document.documentElement.setAttribute('data-density','compact')}})();`;
}
