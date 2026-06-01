import React, { useState } from "react";
import { Text, useInput } from "ink";
import { nextWordBoundary, prevWordBoundary } from "./textBuffer.js";

/**
 * Controlled single-line text input with readline-style keybindings.
 *
 * Keys:
 *   ←/→                       cursor by char
 *   alt+←/→  alt+b/f          cursor by word
 *   backspace                 delete prev char
 *   alt+backspace  ^w         delete prev word (macOS option+delete)
 *   alt+delete     alt+d      delete next word
 *   ^u / ^k                   kill to line start / end
 *   ↵                         submit
 *   Any printable input is inserted at the cursor; newlines are stripped.
 *
 * Props:
 *   value, onChange, onSubmit, placeholder, isActive
 *   onKey(input, key) → true to consume an event before the default handler runs
 */
export default function SingleLineInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  isActive = true,
  onKey,
}) {
  const [col, setCol] = useState(value.length);
  const clampedCol = Math.min(col, value.length);

  const replace = (next, nextCol) => {
    onChange(next);
    setCol(nextCol);
  };

  useInput((input, key) => {
    if (!isActive) return;
    if (onKey?.(input, key) === true) return;

    if (key.return) return onSubmit(value);

    if (key.leftArrow) {
      if (key.meta || key.ctrl) return setCol(prevWordBoundary(value, clampedCol));
      return setCol(Math.max(0, clampedCol - 1));
    }
    if (key.rightArrow) {
      if (key.meta || key.ctrl) return setCol(nextWordBoundary(value, clampedCol));
      return setCol(Math.min(value.length, clampedCol + 1));
    }

    if (key.meta && (input === "b")) return setCol(prevWordBoundary(value, clampedCol));
    if (key.meta && (input === "f")) return setCol(nextWordBoundary(value, clampedCol));

    if (key.ctrl && input === "w") {
      const start = prevWordBoundary(value, clampedCol);
      return replace(value.slice(0, start) + value.slice(clampedCol), start);
    }
    if (key.meta && input === "d") {
      const end = nextWordBoundary(value, clampedCol);
      return replace(value.slice(0, clampedCol) + value.slice(end), clampedCol);
    }
    if (key.ctrl && input === "u") {
      return replace(value.slice(clampedCol), 0);
    }
    if (key.ctrl && input === "k") {
      return replace(value.slice(0, clampedCol), clampedCol);
    }
    if (key.ctrl && input === "a") return setCol(0);
    if (key.ctrl && input === "e") return setCol(value.length);

    // Option+Backspace on macOS arrives as meta+backspace — delete word back
    if (key.meta && key.backspace) {
      const start = prevWordBoundary(value, clampedCol);
      return replace(value.slice(0, start) + value.slice(clampedCol), start);
    }
    if (key.meta && key.delete) {
      const end = nextWordBoundary(value, clampedCol);
      return replace(value.slice(0, clampedCol) + value.slice(end), clampedCol);
    }

    if (key.backspace || key.delete) {
      if (clampedCol === 0) return;
      return replace(value.slice(0, clampedCol - 1) + value.slice(clampedCol), clampedCol - 1);
    }

    if (input && !key.ctrl && !key.meta) {
      const sanitized = input.replace(/[\r\n]/g, "");
      if (!sanitized) return;
      return replace(
        value.slice(0, clampedCol) + sanitized + value.slice(clampedCol),
        clampedCol + sanitized.length,
      );
    }
  });

  if (!value && placeholder) {
    return (
      <Text>
        <Text inverse>{placeholder[0] ?? " "}</Text>
        <Text dimColor>{placeholder.slice(1)}</Text>
      </Text>
    );
  }

  // Nested Text (not flex Box) so long values wrap at terminal width
  return (
    <Text>
      {value.slice(0, clampedCol)}
      <Text inverse>{value[clampedCol] ?? " "}</Text>
      {value.slice(clampedCol + 1)}
    </Text>
  );
}
