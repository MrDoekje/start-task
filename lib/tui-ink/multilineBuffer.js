import { nextWordBoundary, prevWordBoundary } from "./textBuffer.js";

/**
 * Framework-agnostic multi-line text editing model. State is
 * `{ lines: string[], row: number, col: number }`. Every operation is a pure
 * function that returns a new state (or the same reference when it is a no-op).
 *
 * This is the canonical editing behavior — any UI layer rendering a multi-line
 * input must reproduce these transformations exactly.
 */

/** Build initial state from a seed string. Empty seed yields a single empty line. */
export function initBuffer(initialValue) {
  const initialLines = (initialValue ?? "").split("\n");
  return {
    lines: initialLines.length > 0 ? initialLines : [""],
    row: Math.max(0, initialLines.length - 1),
    col: (initialLines[initialLines.length - 1] ?? "").length,
  };
}

/** Serialize state back to a string (lines joined by "\n", no trimming). */
export function toText(state) {
  return state.lines.join("\n");
}

/** Total character count including the implicit newline between lines. */
export function charCount(state) {
  return state.lines.reduce((n, l) => n + l.length, 0) + state.lines.length - 1;
}

/**
 * Insert text at the caret. The text may contain newlines (\n, \r, \r\n) —
 * each splits the current line, mirroring a native paste.
 */
export function insertText(state, text) {
  let { lines, row, col } = state;
  lines = lines.slice();
  const parts = String(text).split(/\r\n|\r|\n/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length > 0) {
      lines[row] = lines[row].slice(0, col) + part + lines[row].slice(col);
      col += part.length;
    }
    if (i < parts.length - 1) {
      const cur = lines[row];
      lines[row] = cur.slice(0, col);
      lines.splice(row + 1, 0, cur.slice(col));
      row += 1;
      col = 0;
    }
  }
  return { lines, row, col };
}

/** Delete the char before the caret; joins with the previous line at column 0. */
export function backspace(state) {
  let { lines, row, col } = state;
  if (col > 0) {
    lines = lines.slice();
    lines[row] = lines[row].slice(0, col - 1) + lines[row].slice(col);
    col -= 1;
  } else if (row > 0) {
    lines = lines.slice();
    const joinCol = lines[row - 1].length;
    lines[row - 1] = lines[row - 1] + lines[row];
    lines.splice(row, 1);
    row -= 1;
    col = joinCol;
  }
  return { lines, row, col };
}

/** Kill from caret to end of the current line (^K). */
export function killToEol(state) {
  const lines = state.lines.slice();
  lines[state.row] = lines[state.row].slice(0, state.col);
  return { ...state, lines };
}

/** Kill from caret to start of the current line (^U). */
export function killToBol(state) {
  const lines = state.lines.slice();
  lines[state.row] = lines[state.row].slice(state.col);
  return { lines, row: state.row, col: 0 };
}

/** Move caret up a row, clamping column to the target line length. */
export function moveUp(state) {
  if (state.row === 0) return state;
  return { ...state, row: state.row - 1, col: Math.min(state.col, state.lines[state.row - 1].length) };
}

/** Move caret down a row, clamping column to the target line length. */
export function moveDown(state) {
  if (state.row >= state.lines.length - 1) return state;
  return { ...state, row: state.row + 1, col: Math.min(state.col, state.lines[state.row + 1].length) };
}

/** Move caret one char left; wraps to end of previous line at column 0. */
export function moveLeft(state) {
  if (state.col > 0) return { ...state, col: state.col - 1 };
  if (state.row > 0) return { ...state, row: state.row - 1, col: state.lines[state.row - 1].length };
  return state;
}

/** Move caret one char right; wraps to start of next line at line end. */
export function moveRight(state) {
  if (state.col < state.lines[state.row].length) return { ...state, col: state.col + 1 };
  if (state.row < state.lines.length - 1) return { ...state, row: state.row + 1, col: 0 };
  return state;
}

/** Move caret to column 0 of the current line. */
export function moveLineStart(state) {
  return { ...state, col: 0 };
}

/** Move caret to end of the current line. */
export function moveLineEnd(state) {
  return { ...state, col: state.lines[state.row].length };
}

/** Move caret to the previous word boundary on the current line. */
export function moveWordLeft(state) {
  return { ...state, col: prevWordBoundary(state.lines[state.row], state.col) };
}

/** Move caret to the next word boundary on the current line. */
export function moveWordRight(state) {
  return { ...state, col: nextWordBoundary(state.lines[state.row], state.col) };
}

/** Delete the word before the caret on the current line. No-op at a boundary. */
export function deleteWordBack(state) {
  const line = state.lines[state.row];
  const start = prevWordBoundary(line, state.col);
  if (start === state.col) return state;
  const lines = state.lines.slice();
  lines[state.row] = line.slice(0, start) + line.slice(state.col);
  return { lines, row: state.row, col: start };
}

/** Delete the word after the caret on the current line. No-op at a boundary. */
export function deleteWordForward(state) {
  const line = state.lines[state.row];
  const end = nextWordBoundary(line, state.col);
  if (end === state.col) return state;
  const lines = state.lines.slice();
  lines[state.row] = line.slice(0, state.col) + line.slice(end);
  return { lines, row: state.row, col: state.col };
}
