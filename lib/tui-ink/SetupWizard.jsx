import React, { useState } from "react";
import { Box, Text } from "ink";
import Select from "./Select.jsx";
import SingleLineInput from "./SingleLineInput.jsx";
import { isCancel } from "./keys.js";
import { ACCENT } from "./theme.js";

function renderOption(item, active) {
  return (
    <Box>
      <Text color={active ? ACCENT : undefined}>{active ? "▌ " : "  "}</Text>
      <Text color={active ? ACCENT : undefined} bold={active}>{item.label}</Text>
    </Box>
  );
}

function SelectField({ items, initialValue, onSelect, onBack }) {
  const initialIndex = Math.max(0, items.findIndex((it) => it.value === initialValue));
  return (
    <Select
      items={items}
      initialIndex={initialIndex}
      onSelect={onSelect}
      onCancel={onBack}
      renderItem={renderOption}
    />
  );
}

function TextField({ initialValue, defaultValue, onSubmit, onBack }) {
  const [value, setValue] = useState(initialValue ?? defaultValue ?? "");
  return (
    <Box>
      <Text color={ACCENT}>▌ </Text>
      <SingleLineInput
        value={value}
        onChange={setValue}
        onSubmit={(raw) => onSubmit(raw.trim() || defaultValue || "")}
        placeholder={defaultValue}
        onKey={(input, key) => {
          if (isCancel(input, key)) { onBack(); return true; }
        }}
      />
    </Box>
  );
}

/**
 * Interactive first-run setup form. Walks the user through agent, terminal,
 * and tmux choices, then resolves with the collected answers (or calls
 * `onCancel` if the user backs out of the first step / declines overwrite).
 *
 * @param {object} props
 * @param {Array<{value: string, label: string, defaultBin: string}>} props.agents
 * @param {Array<{value: string, label: string}>} props.terminals
 * @param {string} props.defaultTmuxBin
 * @param {boolean} props.configExists - when true, a final overwrite confirmation is shown
 * @param {(answers: Record<string, string>) => void} props.onComplete
 * @param {() => void} props.onCancel
 */
export default function SetupWizard({ agents, terminals, defaultTmuxBin, configExists, onComplete, onCancel }) {
  const steps = ["agent", "agentBin", "terminal", "tmuxBin", "sessionName"];
  if (configExists) steps.push("confirm");

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const key = steps[index];

  const back = () => {
    if (index === 0) onCancel();
    else setIndex(index - 1);
  };

  const advance = (patch) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (index === steps.length - 1) onComplete(next);
    else setIndex(index + 1);
  };

  const selectedAgent = agents.find((a) => a.value === answers.agent);

  // Build only the active step's field — the others aren't rendered, so there's
  // no point constructing their elements (and mapping their option lists).
  const renderStep = () => {
    switch (key) {
      case "agent":
        return {
          message: "Which coding agent do you use?",
          field: (
            <SelectField
              items={agents.map((a) => ({ value: a.value, label: a.label }))}
              initialValue={answers.agent}
              onSelect={(value) => advance({ agent: value })}
              onBack={back}
            />
          ),
        };
      case "agentBin":
        return {
          message: "Path to agent binary:",
          field: (
            <TextField
              initialValue={answers.agentBin}
              defaultValue={selectedAgent?.defaultBin}
              onSubmit={(value) => advance({ agentBin: value })}
              onBack={back}
            />
          ),
        };
      case "terminal":
        return {
          message: "Which terminal emulator do you use?",
          field: (
            <SelectField
              items={terminals.map((t) => ({ value: t.value, label: t.label }))}
              initialValue={answers.terminal}
              onSelect={(value) => advance({ terminal: value })}
              onBack={back}
            />
          ),
        };
      case "tmuxBin":
        return {
          message: "Path to tmux binary:",
          field: (
            <TextField
              initialValue={answers.tmuxBin}
              defaultValue={defaultTmuxBin}
              onSubmit={(value) => advance({ tmuxBin: value })}
              onBack={back}
            />
          ),
        };
      case "sessionName":
        return {
          message: "Tmux session name:",
          field: (
            <TextField
              initialValue={answers.sessionName}
              defaultValue="tasks"
              onSubmit={(value) => advance({ sessionName: value })}
              onBack={back}
            />
          ),
        };
      case "confirm":
        return {
          message: "Config file already exists. Overwrite it?",
          field: (
            <SelectField
              items={[
                { value: false, label: "Keep existing config (cancel)" },
                { value: true, label: "Overwrite it" },
              ]}
              onSelect={(value) => (value ? advance({}) : onCancel())}
              onBack={back}
            />
          ),
        };
    }
  };

  const current = renderStep();

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text color={ACCENT}>▌ </Text>
          <Text bold>start-task setup</Text>
        </Box>
        <Text dimColor>step {index + 1} of {steps.length}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold>{current.message.replace(/:\s*$/, "").toUpperCase()}</Text>
      </Box>

      {/* Remount the field whenever the step changes so input state re-seeds. */}
      <Box key={key}>{current.field}</Box>

      <Box marginTop={1}>
        <Text dimColor>↵ continue   esc back</Text>
      </Box>
    </Box>
  );
}
