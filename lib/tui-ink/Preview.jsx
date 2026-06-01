import React, { memo } from "react";
import { Box, Text } from "ink";

/**
 * Resolves a step ref (string key or inline object) to its inline definition.
 */
function resolveStep(step, config) {
  if (typeof step === "string") return config.steps?.[step];
  return step;
}

function summarizeOptions(config, flow) {
  const merged = { ...config, ...(flow.options ?? {}) };
  const rows = [];
  rows.push(["group", flow.group ?? "Other"]);
  if (merged.agent?.name) rows.push(["agent", merged.agent.name]);
  if (merged.git) rows.push(["git", merged.git.name ?? "configured"]);
  if (merged.taskProvider) rows.push(["tracker", merged.taskProvider.name ?? "configured"]);
  if (merged.worktree?.enabled) rows.push(["worktree", "enabled"]);
  return rows;
}

function Preview({ flowKey, config }) {
  if (!flowKey || !config.flows[flowKey]) {
    return (
      <Box paddingX={2} paddingY={1} flexDirection="column">
        <Text dimColor>nothing selected</Text>
      </Box>
    );
  }

  const flow = config.flows[flowKey];
  const steps = (flow.steps ?? []).map((s) => resolveStep(s, config)).filter(Boolean);
  const options = summarizeOptions(config, flow);

  return (
    <Box paddingX={2} paddingY={1} flexDirection="column">
      <Text bold>{flow.label.toUpperCase()}</Text>
      {flow.description ? (
        <Box marginTop={1}>
          <Text dimColor>{flow.description}</Text>
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        {options.map(([k, v]) => (
          <Box key={k}>
            <Box width={9}>
              <Text dimColor>{k}</Text>
            </Box>
            <Text>{v}</Text>
          </Box>
        ))}
      </Box>

      {steps.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>steps</Text>
          {steps.map((step, i) => (
            <Box key={i}>
              <Box width={5}>
                <Text dimColor>  {i + 1}</Text>
              </Box>
              <Text>{stepLabel(step)}</Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text dimColor>(no steps — runs immediately)</Text>
        </Box>
      )}
    </Box>
  );
}

export default memo(Preview);

function stepLabel(step) {
  if (!step) return "";
  // Strip trailing colon and "(optional)" tails from the prompt message for readability
  return (step.message ?? step.key ?? "")
    .replace(/\s*\(optional[^)]*\)\s*$/i, "")
    .replace(/:\s*$/, "");
}
