import React, { useState } from "react";
import { Text, useInput } from "ink";
import {
  charLeft, charRight, wordLeft, wordRight, lineStart, lineEnd,
  deleteWordBack, deleteWordForward, killToStart, killToEnd, backspace, insert,
} from "./singleLineBuffer.js";

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
      if (key.meta || key.ctrl) return setCol(wordLeft(value, clampedCol).col);
      return setCol(charLeft(value, clampedCol).col);
    }
    if (key.rightArrow) {
      if (key.meta || key.ctrl) return setCol(wordRight(value, clampedCol).col);
      return setCol(charRight(value, clampedCol).col);
    }

    if (key.meta && (input === "b")) return setCol(wordLeft(value, clampedCol).col);
    if (key.meta && (input === "f")) return setCol(wordRight(value, clampedCol).col);

    if (key.ctrl && input === "w") {
      const r = deleteWordBack(value, clampedCol);
      return replace(r.value, r.col);
    }
    if (key.meta && input === "d") {
      const r = deleteWordForward(value, clampedCol);
      return replace(r.value, r.col);
    }
    if (key.ctrl && input === "u") {
      const r = killToStart(value, clampedCol);
      return replace(r.value, r.col);
    }
    if (key.ctrl && input === "k") {
      const r = killToEnd(value, clampedCol);
      return replace(r.value, r.col);
    }
    if (key.ctrl && input === "a") return setCol(lineStart(value).col);
    if (key.ctrl && input === "e") return setCol(lineEnd(value).col);

    // Option+Backspace on macOS arrives as meta+backspace — delete word back
    if (key.meta && key.backspace) {
      const r = deleteWordBack(value, clampedCol);
      return replace(r.value, r.col);
    }
    if (key.meta && key.delete) {
      const r = deleteWordForward(value, clampedCol);
      return replace(r.value, r.col);
    }

    if (key.backspace || key.delete) {
      if (clampedCol === 0) return;
      const r = backspace(value, clampedCol);
      return replace(r.value, r.col);
    }

    if (input && !key.ctrl && !key.meta) {
      const r = insert(value, clampedCol, input);
      if (r.col === clampedCol) return;
      return replace(r.value, r.col);
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
