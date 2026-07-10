/**
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {string} insertion
 */
export function insertAtTextCursor(el, insertion) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const value = el.value;
  const newValue = value.slice(0, start) + insertion + value.slice(end);
  const cursorPos = start + insertion.length;
  return { newValue, cursorPos };
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement | null} el
 * @param {number} cursorPos
 */
export function focusTextAtCursor(el, cursorPos) {
  if (!el) return;
  el.focus();
  el.setSelectionRange(cursorPos, cursorPos);
}
