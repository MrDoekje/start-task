import React, { useState } from "react";
import { Box, Text, useStdin } from "ink";
import SingleLineInput from "../SingleLineInput.jsx";
import { runStepPipeline, spawnEditor } from "../stepHelpers.js";
import { isCancel } from "../keys.js";
import { ACCENT, ERROR } from "../theme.js";

/**
 * Single-line text step. Esc = back, Enter = submit (with validate/transform/postValidate),
 * Ctrl+E = bail to $EDITOR for multi-line content (auto-submits on save).
 *
 * If the step defines `clean(value)`, a sanitized suggestion is shown below the
 * input whenever it differs from the current value, and Tab applies it.
 */
export default function TextStep({ step, initialValue, config, utils, onSubmit, onBack }) {
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState(null);
  const { setRawMode, isRawModeSupported } = useStdin();

  const suggestion = step.clean ? step.clean(value) : "";
  const showSuggestion = Boolean(suggestion) && suggestion !== value.trim();

  const submit = (raw) => {
    const r = runStepPipeline(raw, step, utils, config);
    if (r.error) {
      setValue(raw);
      setError(r.error);
      return;
    }
    onSubmit(r.value);
  };

  const openEditor = () => {
    try {
      const raw = spawnEditor({
        initial: value,
        setRawMode,
        isRawModeSupported,
      });
      submit(raw);
    } catch (e) {
      setError(`editor failed: ${e?.message ?? String(e)}`);
    }
  };

  const applySuggestion = () => { setError(null); setValue(suggestion); };

  const handleKey = (input, key) => {
    if (isCancel(input, key)) { onBack(); return true; }
    if (key.ctrl && input === "e") { openEditor(); return true; }
    if (key.tab && showSuggestion) { applySuggestion(); return true; }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={ACCENT}>▌ </Text>
        <SingleLineInput
          value={value}
          onChange={(v) => { setError(null); setValue(v); }}
          onSubmit={submit}
          placeholder={step.placeholder}
          onKey={handleKey}
        />
      </Box>
      {showSuggestion ? (
        <Box marginTop={1}>
          <Text dimColor>clean: </Text>
          <Text color={ACCENT}>{suggestion}</Text>
          <Text dimColor>  (tab to apply)</Text>
        </Box>
      ) : null}
      {error ? (
        <Box marginTop={1}>
          <Text color={ERROR}>{error}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
