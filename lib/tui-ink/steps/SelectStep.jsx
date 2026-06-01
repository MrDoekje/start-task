import React from "react";
import { Box, Text } from "ink";
import Select from "../Select.jsx";
import { resolveStepOptions } from "../stepHelpers.js";
import { ACCENT } from "../theme.js";

function renderItem(item, active) {
  return (
    <Box>
      <Text color={active ? ACCENT : undefined}>{active ? "▌ " : "  "}</Text>
      <Text color={active ? ACCENT : undefined} bold={active}>{item.label}</Text>
      {item.hint ? (
        <>
          <Text dimColor>   </Text>
          <Text dimColor>{item.hint}</Text>
        </>
      ) : null}
    </Box>
  );
}

export default function SelectStep({ step, initialValue, config, onSubmit, onBack }) {
  const options = resolveStepOptions(step, config);
  const items = options.map((opt) => ({ value: opt.value, label: opt.label, hint: opt.hint }));
  const initialIndex = Math.max(0, items.findIndex((it) => it.value === initialValue));

  return (
    <Select
      items={items}
      initialIndex={initialIndex}
      onSelect={onSubmit}
      onCancel={onBack}
      renderItem={renderItem}
      filterable
    />
  );
}
