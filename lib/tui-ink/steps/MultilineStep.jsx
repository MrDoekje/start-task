import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { runStepPipeline } from "../stepHelpers.js";
import * as buf from "../multilineBuffer.js";
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
  const [state, setState] = useState(() => buf.initBuffer(initialValue));
  const [error, setError] = useState(null);

  const submit = () => {
    const raw = buf.toText(state).replace(/\s+$/, "");
    const r = runStepPipeline(raw, step, utils, config);
    if (r.error) return setError(r.error);
    onSubmit(r.value);
  };

  const insertText = (text) => { setState((s) => buf.insertText(s, text)); setError(null); };
  const backspace = () => { setState(buf.backspace); setError(null); };
  const killToEol = () => setState(buf.killToEol);
  const moveUp = () => setState(buf.moveUp);
  const moveDown = () => setState(buf.moveDown);
  const moveLeft = () => setState(buf.moveLeft);
  const moveRight = () => setState(buf.moveRight);
  const moveLineStart = () => setState(buf.moveLineStart);
  const moveLineEnd = () => setState(buf.moveLineEnd);
  const moveWordLeft = () => setState(buf.moveWordLeft);
  const moveWordRight = () => setState(buf.moveWordRight);
  const deleteWordBack = () => { setState(buf.deleteWordBack); setError(null); };
  const deleteWordForward = () => { setState(buf.deleteWordForward); setError(null); };
  const killToBol = () => { setState(buf.killToBol); setError(null); };

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

  const charCount = buf.charCount(state);

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
