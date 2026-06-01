import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { resolveStepOptions } from "../stepHelpers.js";
import { isCancel } from "../keys.js";
import { ACCENT, ERROR } from "../theme.js";

/**
 * Multiselect step: space toggles, enter submits, esc goes back.
 * Supports an inline filter activated with `/`.
 */
export default function MultiselectStep({ step, initialValue, config, onSubmit, onBack }) {
  const allOptions = resolveStepOptions(step, config);
  const [selected, setSelected] = useState(() => new Set(initialValue ?? []));
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState(false);
  const [filter, setFilter] = useState("");

  const needle = filter.toLowerCase();
  const options = filter
    ? allOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(needle) ||
          String(o.value).toLowerCase().includes(needle),
      )
    : allOptions;

  const clampedCursor = Math.min(cursor, Math.max(0, options.length - 1));

  const toggleCurrent = () => {
    const opt = options[clampedCursor];
    if (!opt) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opt.value)) next.delete(opt.value);
      else next.add(opt.value);
      return next;
    });
  };

  useInput((input, key) => {
    // Filter-mode-only keys; everything else falls through to shared handling.
    if (filterMode) {
      if (isCancel(input, key)) { setFilterMode(false); setFilter(""); return; }
      if (key.return) { setFilterMode(false); return; }
      if (key.backspace || key.delete) { setFilter(filter.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta && input !== " " && !/[\r\n]/.test(input)) {
        setFilter(filter + input);
        return;
      }
      // fall through for arrows + space
    } else {
      if (isCancel(input, key)) return onBack();
      if (input === "/") { setFilterMode(true); return; }
      if (key.return) {
        if (step.required && selected.size === 0) return setError("please select at least one");
        return onSubmit([...selected]);
      }
    }

    if (key.upArrow) return setCursor(Math.max(0, clampedCursor - 1));
    if (key.downArrow) return setCursor(Math.min(options.length - 1, clampedCursor + 1));
    if (input === " ") return toggleCurrent();
  });

  return (
    <Box flexDirection="column">
      {filterMode || filter ? (
        <Box marginBottom={1}>
          <Text dimColor>filter  </Text>
          <Text color={ACCENT}>{filter}</Text>
          {filterMode ? <Text color={ACCENT}>▌</Text> : null}
        </Box>
      ) : null}

      {options.length === 0 ? (
        <Text dimColor>  no matches</Text>
      ) : (
        options.map((opt, i) => {
          const isActive = i === clampedCursor;
          const isSelected = selected.has(opt.value);
          return (
            <Box key={opt.value}>
              <Text color={isActive ? ACCENT : undefined}>{isActive ? "▌ " : "  "}</Text>
              <Text color={isSelected ? ACCENT : "gray"}>{isSelected ? "◉" : "○"} </Text>
              <Text color={isActive ? ACCENT : undefined} bold={isActive}>{opt.label}</Text>
              {opt.hint ? (
                <>
                  <Text dimColor>   </Text>
                  <Text dimColor>{opt.hint}</Text>
                </>
              ) : null}
            </Box>
          );
        })
      )}

      <Box marginTop={1}>
        <Text dimColor>{selected.size} selected</Text>
      </Box>
      {error ? (
        <Box marginTop={1}><Text color={ERROR}>{error}</Text></Box>
      ) : null}
    </Box>
  );
}
