import React from "react";
import { Box, Text } from "ink";
import { loadConfig } from "../loadConfig.js";
import { buildActionUtils } from "../actionUtils.js";
import { formatError } from "../validation.js";
import { recordUsage } from "../usageStore.js";
import { renderScreen } from "./renderScreen.js";
import { runFlow } from "./runFlow.jsx";
import MainMenu from "./MainMenu.jsx";
import Select from "./Select.jsx";
import ActiveTasks from "./ActiveTasks.jsx";
import { ACCENT } from "./theme.js";

function submenuRenderItem(item, active) {
  if (item.disabled) return <Text dimColor>{item.label}</Text>;
  return (
    <Box>
      <Text color={active ? ACCENT : undefined}>{active ? "▌ " : "  "}</Text>
      <Text color={active ? ACCENT : undefined} bold={active}>{item.label}</Text>
    </Box>
  );
}

async function showSubmenuScreen(config, groupName) {
  const entries = Object.entries(config.flows).filter(
    ([, flow]) => (flow.group ?? "Other") === groupName,
  );
  return renderScreen((onResult) => (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text color={ACCENT}>▌ </Text>
        <Text bold>{groupName.toLowerCase()}</Text>
      </Box>
      <Select
        items={[
          ...entries.map(([key, flow]) => ({
            value: { kind: "flow", flowKey: key },
            label: flow.label,
          })),
          { disabled: true, label: "" },
          { value: { kind: "back" }, label: "← back" },
        ]}
        onSelect={onResult}
        onCancel={() => onResult({ kind: "back" })}
        renderItem={submenuRenderItem}
      />
    </Box>
  ));
}

export default async function runTui() {
  let config = await loadConfig();
  let utils = buildActionUtils(config);

  while (true) {
    const choice = await renderScreen((onResult) => (
      <MainMenu config={config} utils={utils} onSelect={onResult} />
    ));

    if (!choice || choice.kind === "quit") break;

    try {
      if (choice.kind === "restart") {
        // Exit with code 99 so the shell wrapper in cli.js relaunches the TUI
        // in a fresh process. This is the only way to pick up code changes —
        // an in-process reload keeps every non-config module in the ESM cache.
        console.clear();
        process.stdout.write("restarting…\n");
        process.exit(99);
      }

      if (choice.kind === "active") {
        await renderScreen((onResult) => (
          <ActiveTasks utils={utils} onExit={() => onResult()} />
        ));
        continue;
      }

      if (choice.kind === "submenu") {
        const sub = await showSubmenuScreen(config, choice.group);
        if (sub?.kind === "flow") {
          const flow = config.flows[sub.flowKey];
          if (flow && (await runFlow(flow, config, undefined, renderScreen))) {
            recordUsage(sub.flowKey);
          }
        }
        continue;
      }

      if (choice.kind === "flow") {
        const flow = config.flows[choice.flowKey];
        if (flow && (await runFlow(flow, config, undefined, renderScreen))) {
          recordUsage(choice.flowKey);
        }
        continue;
      }
    } catch (err) {
      console.error(formatError(err));
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("Goodbye!");
}
