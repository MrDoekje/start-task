import { nextWordBoundary, prevWordBoundary } from "./textBuffer.js";

/**
 * Framework-agnostic single-line text editing model. Every operation is a pure
 * function over a `{ value, col }` state and returns a new `{ value, col }`.
 * Readline-style semantics — the same behavior any UI layer must reproduce.
 *
 * `col` is a caret position in [0, value.length]. Operations clamp internally,
 * so callers may pass an unclamped `col` (e.g. from a controlled component
 * whose value shrank out from under a stale caret).
 */

/** Clamp a caret column to the valid range for `value`. */
export function clampCol(value, col) {
  return Math.min(Math.max(0, col), value.length);
}

/** Move caret one char left (stops at 0). */
export function charLeft(value, col) {
  const c = clampCol(value, col);
  return { value, col: Math.max(0, c - 1) };
}

/** Move caret one char right (stops at end). */
export function charRight(value, col) {
  const c = clampCol(value, col);
  return { value, col: Math.min(value.length, c + 1) };
}

/** Move caret to the start of the previous word. */
export function wordLeft(value, col) {
  return { value, col: prevWordBoundary(value, clampCol(value, col)) };
}

/** Move caret past the end of the next word. */
export function wordRight(value, col) {
  return { value, col: nextWordBoundary(value, clampCol(value, col)) };
}

/** Move caret to column 0. */
export function lineStart(value) {
  return { value, col: 0 };
}

/** Move caret to the end of the value. */
export function lineEnd(value) {
  return { value, col: value.length };
}

/** Delete the word before the caret. */
export function deleteWordBack(value, col) {
  const c = clampCol(value, col);
  const start = prevWordBoundary(value, c);
  return { value: value.slice(0, start) + value.slice(c), col: start };
}

/** Delete the word after the caret. */
export function deleteWordForward(value, col) {
  const c = clampCol(value, col);
  const end = nextWordBoundary(value, c);
  return { value: value.slice(0, c) + value.slice(end), col: c };
}

/** Kill from caret to line start (^U). */
export function killToStart(value, col) {
  const c = clampCol(value, col);
  return { value: value.slice(c), col: 0 };
}

/** Kill from caret to line end (^K). */
export function killToEnd(value, col) {
  const c = clampCol(value, col);
  return { value: value.slice(0, c), col: c };
}

/** Delete the char before the caret. No-op at column 0. */
export function backspace(value, col) {
  const c = clampCol(value, col);
  if (c === 0) return { value, col: c };
  return { value: value.slice(0, c - 1) + value.slice(c), col: c - 1 };
}

/**
 * Insert text at the caret. Newlines are stripped (single-line input).
 * No-op when the sanitized input is empty.
 */
export function insert(value, col, input) {
  const c = clampCol(value, col);
  const sanitized = String(input).replace(/[\r\n]/g, "");
  if (!sanitized) return { value, col: c };
  return {
    value: value.slice(0, c) + sanitized + value.slice(c),
    col: c + sanitized.length,
  };
}
