import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { runStepPipeline } from "../stepHelpers.js";
import { nextWordBoundary, prevWordBoundary } from "../textBuffer.js";
import { isCancel } from "../keys.js";
import { ERROR } from "../theme.js";

/**
 * Multi-line text input with native paste handling.
 *
 * Keys:
 *   Enter       — insert newline at cursor
 *   ^D / ^S     — submit (running step.validate / transform / postValidate)
 *   Esc         — back
 *   ←/→/↑/↓     — cursor by char (wraps line boundaries horizontally)
 *   alt+← / →   — cursor by word (current line only)
 *   alt+b / f   — cursor by word (current line only)
 *   ^a / ^e     — line start / end
 *   Backspace   — delete prev char; joins lines at column 0
 *   alt+bksp ^w — delete prev word (current line)   (macOS option+delete)
 *   alt+del  alt+d — delete next word (current line)
 *   ^u          — kill to line start
 *   ^k          — kill to line end
 *   Any printable input (including pasted blobs containing newlines) is
 *   inserted at the cursor in one batched state update.
 */
export default function MultilineStep({ step, initialValue, config, utils, onSubmit, onBack }) {
  const initialLines = (initialValue ?? "").split("\n");
  const [state, setState] = useState(() => ({
    lines: initialLines.length > 0 ? initialLines : [""],
    row: Math.max(0, initialLines.length - 1),
    col: (initialLines[initialLines.length - 1] ?? "").length,
  }));
  const [error, setError] = useState(null);

  const submit = () => {
    const raw = state.lines.join("\n").replace(/\s+$/, "");
    const r = runStepPipeline(raw, step, utils, config);
    if (r.error) return setError(r.error);
    onSubmit(r.value);
  };

  const insertText = (text) => {
    setState((s) => {
      let { lines, row, col } = s;
      lines = lines.slice();
      const parts = text.split(/\r\n|\r|\n/);
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
    });
    setError(null);
  };

  const backspace = () => {
    setState((s) => {
      let { lines, row, col } = s;
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
    });
    setError(null);
  };

  const killToEol = () => {
    setState((s) => {
      const lines = s.lines.slice();
      lines[s.row] = lines[s.row].slice(0, s.col);
      return { ...s, lines };
    });
  };

  const moveUp = () => setState((s) => {
    if (s.row === 0) return s;
    return { ...s, row: s.row - 1, col: Math.min(s.col, s.lines[s.row - 1].length) };
  });

  const moveDown = () => setState((s) => {
    if (s.row >= s.lines.length - 1) return s;
    return { ...s, row: s.row + 1, col: Math.min(s.col, s.lines[s.row + 1].length) };
  });

  const moveLeft = () => setState((s) => {
    if (s.col > 0) return { ...s, col: s.col - 1 };
    if (s.row > 0) return { ...s, row: s.row - 1, col: s.lines[s.row - 1].length };
    return s;
  });

  const moveRight = () => setState((s) => {
    if (s.col < s.lines[s.row].length) return { ...s, col: s.col + 1 };
    if (s.row < s.lines.length - 1) return { ...s, row: s.row + 1, col: 0 };
    return s;
  });

  const moveLineStart = () => setState((s) => ({ ...s, col: 0 }));
  const moveLineEnd = () => setState((s) => ({ ...s, col: s.lines[s.row].length }));

  const moveWordLeft = () => setState((s) => ({ ...s, col: prevWordBoundary(s.lines[s.row], s.col) }));
  const moveWordRight = () => setState((s) => ({ ...s, col: nextWordBoundary(s.lines[s.row], s.col) }));

  const deleteWordBack = () => {
    setState((s) => {
      const line = s.lines[s.row];
      const start = prevWordBoundary(line, s.col);
      if (start === s.col) return s;
      const lines = s.lines.slice();
      lines[s.row] = line.slice(0, start) + line.slice(s.col);
      return { lines, row: s.row, col: start };
    });
    setError(null);
  };

  const deleteWordForward = () => {
    setState((s) => {
      const line = s.lines[s.row];
      const end = nextWordBoundary(line, s.col);
      if (end === s.col) return s;
      const lines = s.lines.slice();
      lines[s.row] = line.slice(0, s.col) + line.slice(end);
      return { lines, row: s.row, col: s.col };
    });
    setError(null);
  };

  const killToBol = () => {
    setState((s) => {
      const lines = s.lines.slice();
      lines[s.row] = lines[s.row].slice(s.col);
      return { lines, row: s.row, col: 0 };
    });
    setError(null);
  };

  useInput((input, key) => {
    if (isCancel(input, key)) return onBack();
    if (key.ctrl && (input === "d" || input === "s")) return submit();

    // Word-level navigation / deletion (alt = meta on most terminals).
    // macOS option+delete arrives as meta+backspace.
    if (key.meta && key.backspace) return deleteWordBack();
    if (key.meta && key.delete) return deleteWordForward();
    if (key.ctrl && input === "w") return deleteWordBack();
    if (key.meta && input === "d") return deleteWordForward();
    if (key.meta && input === "b") return moveWordLeft();
    if (key.meta && input === "f") return moveWordRight();
    if ((key.meta || key.ctrl) && key.leftArrow) return moveWordLeft();
    if ((key.meta || key.ctrl) && key.rightArrow) return moveWordRight();

    if (key.ctrl && input === "u") return killToBol();
    if (key.ctrl && input === "k") return killToEol();
    if (key.ctrl && input === "a") return moveLineStart();
    if (key.ctrl && input === "e") return moveLineEnd();

    if (key.return) return insertText("\n");
    if (key.backspace || key.delete) return backspace();
    if (key.upArrow) return moveUp();
    if (key.downArrow) return moveDown();
    if (key.leftArrow) return moveLeft();
    if (key.rightArrow) return moveRight();

    if (input && !key.ctrl && !key.meta) return insertText(input);
  });

  const charCount = state.lines.reduce((n, l) => n + l.length, 0) + state.lines.length - 1;

  return (
    <Box flexDirection="column">
      {state.lines.map((line, i) => (
        i === state.row ? (
          // Nested Text (not flex Box) so the line wraps naturally at terminal width
          <Text key={i}>
            {line.slice(0, state.col)}
            <Text inverse>{line[state.col] ?? " "}</Text>
            {line.slice(state.col + 1)}
          </Text>
        ) : (
          <Text key={i}>{line || " "}</Text>
        )
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          {state.lines.length} line{state.lines.length === 1 ? "" : "s"}
          {"  ·  "}
          {charCount} chars
        </Text>
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color={ERROR}>{error}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
