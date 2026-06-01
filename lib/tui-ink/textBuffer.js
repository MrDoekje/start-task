/**
 * Readline-style word boundary detection. A "word" is a run of alphanumeric
 * (and `_`) characters; anything else is a separator.
 */
const WORD_CHAR = /[A-Za-z0-9_]/;

/**
 * Returns the column index of the start of the word at or before `col`.
 * Skips trailing separators then skips back through the word body, matching
 * readline's `backward-word` (M-b).
 */
export function prevWordBoundary(line, col) {
  let i = col;
  while (i > 0 && !WORD_CHAR.test(line[i - 1])) i--;
  while (i > 0 && WORD_CHAR.test(line[i - 1])) i--;
  return i;
}

/**
 * Returns the column index past the end of the next word from `col`.
 * Skips any leading separators, then skips through the word body — symmetric
 * to `prevWordBoundary`, and matches readline's `forward-word` (M-f).
 */
export function nextWordBoundary(line, col) {
  let i = col;
  while (i < line.length && !WORD_CHAR.test(line[i])) i++;
  while (i < line.length && WORD_CHAR.test(line[i])) i++;
  return i;
}
