/**
 * Framework-agnostic keyboard-list navigation primitives. Items are objects
 * that may carry `disabled: true` (rendered as headers/separators and skipped
 * during navigation). All functions are pure.
 */

/**
 * Pick the starting cursor index: honor `initialIndex` if it points at an
 * enabled item, otherwise fall back to the first enabled item (-1 if none).
 */
export function initialEnabledIndex(items, initialIndex = 0) {
  const firstEnabled = items.findIndex((it) => !it.disabled);
  return items[initialIndex] && !items[initialIndex].disabled ? initialIndex : firstEnabled;
}

/**
 * Index of the previous enabled item above `index`. With `wrap` (default), if
 * none is found above, scans from the bottom back down to `index`. Returns the
 * original `index` when no other enabled item exists.
 */
export function prevEnabledIndex(items, index, { wrap = true } = {}) {
  for (let i = index - 1; i >= 0; i--) {
    if (!items[i].disabled) return i;
  }
  if (wrap) {
    for (let i = items.length - 1; i > index; i--) {
      if (!items[i].disabled) return i;
    }
  }
  return index;
}

/**
 * Index of the next enabled item below `index`. With `wrap` (default), if none
 * is found below, scans from the top up to `index`. Returns the original
 * `index` when no other enabled item exists.
 */
export function nextEnabledIndex(items, index, { wrap = true } = {}) {
  for (let i = index + 1; i < items.length; i++) {
    if (!items[i].disabled) return i;
  }
  if (wrap) {
    for (let i = 0; i < index; i++) {
      if (!items[i].disabled) return i;
    }
  }
  return index;
}

/**
 * Filter items by a case-insensitive substring of their match text (default
 * the `label`). Disabled items are dropped. Empty filter returns items as-is.
 */
export function filterByLabel(items, filter, matchText) {
  if (!filter) return items;
  const needle = filter.toLowerCase();
  const get = matchText || ((it) => it.label ?? "");
  return items.filter((it) => !it.disabled && get(it).toLowerCase().includes(needle));
}

/**
 * Filter options by a case-insensitive match against either the label or the
 * stringified value (used by multiselect). Empty filter returns options as-is.
 */
export function filterByLabelOrValue(options, filter) {
  if (!filter) return options;
  const needle = filter.toLowerCase();
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(needle) ||
      String(o.value).toLowerCase().includes(needle),
  );
}

/** Clamp a cursor index to a list of `length` items (never negative). */
export function clampCursor(cursor, length) {
  return Math.min(cursor, Math.max(0, length - 1));
}

/** Toggle a value's membership in a set, returning a new Set. */
export function toggleValue(selected, value) {
  const next = new Set(selected);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
