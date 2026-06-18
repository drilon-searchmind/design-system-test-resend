/**
 * Runs before interactive paint — theme + density match localStorage (no flash).
 * Keys must match `lib/theme/constants.js`.
 */

export function themeInitScriptInnerHtml() {
  return `(function(){try{var kt='apex-theme',tt=localStorage.getItem(kt);if(tt==='dark')document.documentElement.setAttribute('data-theme','dark');else document.documentElement.setAttribute('data-theme','light');var kd='apex-density',d=localStorage.getItem(kd);if(d==='spacious')document.documentElement.setAttribute('data-density','spacious');else document.documentElement.setAttribute('data-density','compact')}catch(_){document.documentElement.setAttribute('data-theme','light');document.documentElement.setAttribute('data-density','compact')}})();`;
}
