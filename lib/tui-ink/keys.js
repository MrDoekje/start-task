/**
 * Returns true for the standard "cancel / back" key chord: Esc or Ctrl+C.
 * Centralized so every screen treats both identically.
 */
export const isCancel = (input, key) => key.escape || (key.ctrl && input === "c");
