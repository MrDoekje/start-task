import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import TextStep from "./steps/TextStep.jsx";
import EditorStep from "./steps/EditorStep.jsx";
import SelectStep from "./steps/SelectStep.jsx";
import MultiselectStep from "./steps/MultiselectStep.jsx";
import MultilineStep from "./steps/MultilineStep.jsx";
import { ACCENT, ERROR } from "./theme.js";

const STEP_COMPONENTS = {
  text: TextStep,
  editor: EditorStep,
  select: SelectStep,
  multiselect: MultiselectStep,
  multiline: MultilineStep,
};

function stepShortcuts(step) {
  switch (step.type) {
    case "text": {
      const shortcuts = [["↵", "continue"], ["^W", "del word"], ["^E", "editor"]];
      if (step.clean) shortcuts.push(["tab", "clean"]);
      shortcuts.push(["esc", "back"]);
      return shortcuts;
    }
    case "editor": return [["esc", "back"]];
    case "select": return [["↵", "select"], ["/", "filter"], ["esc", "back"]];
    case "multiselect":
      return [["space", "toggle"], ["↵", "continue"], ["/", "filter"], ["esc", "back"]];
    case "multiline":
      return [["↵", "newline"], ["^D", "submit"], ["^W", "del word"], ["esc", "back"]];
    default: return [["esc", "back"]];
  }
}

function cleanMessage(msg) {
  if (!msg) return "";
  return msg.replace(/:\s*$/, "");
}

/**
 * Find the next non-skipped step in a given direction. Skips steps whose
 * `when(results, config)` returns false. Returns steps.length (forward
 * sentinel) or -1 (backward sentinel) when no step is reachable.
 */
function nextActiveIndex(steps, from, dir, results, config) {
  let i = from;
  while (i >= 0 && i < steps.length) {
    const step = steps[i];
    if (!step.when || step.when(results, config)) return i;
    i += dir;
  }
  return dir > 0 ? steps.length : -1;
}

function Dots({ total, index }) {
  return (
    <Box>
      {Array.from({ length: total }, (_, i) => (
        <Text key={i} color={i === index ? ACCENT : undefined} dimColor={i !== index}>
          {i < index ? "●" : i === index ? "●" : "○"}{i < total - 1 ? " " : ""}
        </Text>
      ))}
    </Box>
  );
}

function ShortcutBar({ step }) {
  const items = stepShortcuts(step);
  return (
    <Box paddingX={2}>
      {items.map(([k, label], i) => (
        <Box key={i}>
          {i > 0 ? <Text dimColor>   </Text> : null}
          <Text dimColor>{k} </Text>
          <Text>{label}</Text>
        </Box>
      ))}
    </Box>
  );
}

export default function Wizard({ steps, config, utils, title, onComplete, onCancel }) {
  const [index, setIndex] = useState(() => nextActiveIndex(steps, 0, 1, {}, config));
  const [results, setResults] = useState({});

  // If the entry index is already past the end (no active steps), complete with {}
  useEffect(() => {
    if (index >= steps.length) onComplete({});
    else if (index < 0) onCancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (index >= steps.length || index < 0) return null;

  const step = steps[index];
  const StepComponent = STEP_COMPONENTS[step.type];

  const handleSubmit = (value) => {
    const newResults = { ...results, [step.key]: value };
    setResults(newResults);
    const next = nextActiveIndex(steps, index + 1, 1, newResults, config);
    if (next >= steps.length) onComplete(newResults);
    else setIndex(next);
  };

  const handleBack = () => {
    const prev = nextActiveIndex(steps, index - 1, -1, results, config);
    if (prev < 0) onCancel();
    else setIndex(prev);
  };

  if (!StepComponent) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color={ERROR}>unknown step type: {step.type}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray">
      <Box justifyContent="space-between" paddingX={2} paddingY={1}>
        <Box>
          <Text color={ACCENT}>▌ </Text>
          <Text bold>{title}</Text>
        </Box>
        <Box>
          <Text dimColor>step {index + 1} of {steps.length}   </Text>
          <Dots total={steps.length} index={index} />
        </Box>
      </Box>

      <Box paddingX={2} paddingTop={1} paddingBottom={1} flexDirection="column">
        <Text bold>{cleanMessage(step.message).toUpperCase()}</Text>
      </Box>

      <Box paddingX={2} paddingBottom={1} flexDirection="column">
        <StepComponent
          step={step}
          initialValue={results[step.key]}
          config={config}
          utils={utils}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      </Box>

      <Box paddingTop={1} paddingBottom={1}>
        <ShortcutBar step={step} />
      </Box>
    </Box>
  );
}
