import React, { memo } from "react";
import { Box, Text } from "ink";
import { resolveStep, summarizeOptions, stepLabel } from "./previewModel.js";

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
