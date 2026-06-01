import React, { useMemo, useState } from "react";
import { Box, Text, useStdout } from "ink";
import Select from "./Select.jsx";
import Preview from "./Preview.jsx";
import StatusBar from "./StatusBar.jsx";
import { loadUsage, topFlowKeys } from "../usageStore.js";
import { isCancel } from "./keys.js";
import { ACCENT } from "./theme.js";

const WIDE_THRESHOLD = 100;
const MAX_ITEM_HOTKEYS = 9;
const EMPTY_ITEMS = Object.freeze([]);

function resolveFrequentlyUsed(setting) {
  if (setting === false) return { enabled: false, count: 0 };
  const enabled = setting?.enabled !== false;
  const count = Number.isInteger(setting?.count) && setting.count > 0 ? setting.count : 3;
  return { enabled, count };
}

/**
 * Build the tab list. Each tab: { id, label, hotkey, items: [{flowKey, label}], promotedFromGroup? }
 * The Recent tab is included only when frequentlyUsed yields entries.
 * Items in non-Recent tabs are de-duplicated against the Recent set so the user
 * doesn't see the same flow twice.
 */
function buildTabs(config) {
  const flowEntries = Object.entries(config.flows);
  const flowByKey = new Map(flowEntries);
  const tabs = [];

  // Group flows by their config.group
  const groups = new Map();
  for (const [key, flow] of flowEntries) {
    const g = flow.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ flowKey: key, flow });
  }

  // Recent tab (does NOT deduplicate against group tabs — items can appear in both)
  const { enabled: freqEnabled, count: freqCount } = resolveFrequentlyUsed(config.frequentlyUsed);
  if (freqEnabled) {
    const availableKeys = new Set(flowEntries.map(([key]) => key));
    const topKeys = topFlowKeys(loadUsage(), availableKeys, freqCount);
    if (topKeys.length > 0) {
      tabs.push({
        id: "recent",
        label: "recent",
        hotkey: "r",
        items: topKeys.map((k) => ({ flowKey: k, label: flowByKey.get(k).label })),
      });
    }
  }

  // One tab per group, in encounter order
  for (const [name, entries] of groups) {
    const items = entries.map(({ flowKey, flow }) => ({ flowKey, label: flow.label }));
    if (items.length === 0) continue;
    tabs.push({
      id: name.toLowerCase(),
      label: name.toLowerCase(),
      hotkey: pickHotkey(name.toLowerCase(), tabs),
      items,
    });
  }

  return tabs;
}

/**
 * Pick a single-char hotkey for a tab; first non-conflicting letter of the label,
 * falling back to subsequent letters if there is a clash.
 */
function pickHotkey(label, existingTabs) {
  const used = new Set(existingTabs.map((t) => t.hotkey));
  for (const ch of label.toLowerCase()) {
    if (/[a-z]/.test(ch) && !used.has(ch)) return ch;
  }
  return null;
}

function TabBar({ tabs, activeIndex, muted }) {
  return (
    <Box paddingX={2} paddingTop={1}>
      {tabs.map((t, i) => {
        const active = !muted && i === activeIndex;
        const [first, ...rest] = t.label;
        const color = active ? ACCENT : undefined;
        return (
          <Box key={t.id}>
            {i > 0 ? <Text dimColor>      </Text> : null}
            <Text color={color} dimColor={!active}>
              {active ? "▌ " : "  "}
            </Text>
            <Text color={color} bold={active} dimColor={!active} underline>
              {first}
            </Text>
            <Text color={color} bold={active} dimColor={!active}>
              {rest.join("")}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function renderItem(item, active) {
  return (
    <Box>
      <Text color={active ? ACCENT : undefined}>{active ? "▌ " : "  "}</Text>
      <Box width={3}>
        <Text dimColor>{item.hotkey ? item.hotkey : " "}</Text>
      </Box>
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

function FilterRow({ value, active }) {
  return (
    <Box paddingX={2} paddingBottom={1}>
      <Text dimColor>filter  </Text>
      <Text color={ACCENT}>{value}</Text>
      {active ? <Text color={ACCENT}>▌</Text> : null}
    </Box>
  );
}

function ShortcutBar() {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Box>
        <Text dimColor>↵ </Text><Text>run</Text>
        <Text dimColor>   1-9 </Text><Text>hotkey</Text>
        <Text dimColor>   ←→ </Text><Text>tabs</Text>
        <Text dimColor>   / </Text><Text>filter</Text>
      </Box>
      <Box>
        <Text dimColor>^A </Text><Text>active</Text>
        <Text dimColor>   ^R </Text><Text>restart</Text>
        <Text dimColor>   ^Q </Text><Text>quit</Text>
      </Box>
    </Box>
  );
}

export default function MainMenu({ config, utils, onSelect }) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const wide = width >= WIDE_THRESHOLD;

  // buildTabs reads usage from disk — memoize against config identity.
  const tabs = useMemo(() => buildTabs(config), [config]);
  const [activeTab, setActiveTab] = useState(0);
  const [filterMode, setFilterMode] = useState(false);
  const [filter, setFilter] = useState("");
  const [hoveredKey, setHoveredKey] = useState(tabs[0]?.items[0]?.flowKey ?? null);

  const tab = tabs[Math.min(activeTab, Math.max(0, tabs.length - 1))];
  const baseItems = tab?.items ?? EMPTY_ITEMS;
  const filtering = filter.length > 0;

  const decoratedItems = useMemo(() => {
    if (filtering) {
      const needle = filter.toLowerCase();
      return Object.entries(config.flows)
        .filter(([, flow]) => flow.label.toLowerCase().includes(needle))
        .map(([flowKey, flow], i) => ({
          value: flowKey,
          label: flow.label,
          hint: (flow.group ?? "other").toLowerCase(),
          hotkey: i < MAX_ITEM_HOTKEYS ? String(i + 1) : null,
        }));
    }
    return baseItems.map((it, i) => ({
      value: it.flowKey,
      label: it.label,
      hotkey: i < MAX_ITEM_HOTKEYS ? String(i + 1) : null,
    }));
  }, [filtering, filter, baseItems, config.flows]);

  const switchTab = (next) => {
    if (next < 0) next = tabs.length - 1;
    if (next >= tabs.length) next = 0;
    setActiveTab(next);
    setHoveredKey(tabs[next]?.items[0]?.flowKey ?? null);
  };

  const handleKey = (input, key) => {
    // Filter typing supersedes hotkeys
    if (filterMode) {
      if (isCancel(input, key)) { setFilterMode(false); setFilter(""); return true; }
      if (key.return) {
        setFilterMode(false);
        // Let Select handle Enter so the focused item runs immediately.
        return false;
      }
      if (key.backspace || key.delete) { setFilter(filter.slice(0, -1)); return true; }
      if (key.upArrow || key.downArrow) return false;
      if (input && !key.ctrl && !key.meta) { setFilter(filter + input); return true; }
      return true;
    }

    // Ctrl+C quits the menu (Esc would too, via Select.onCancel below)
    if (key.ctrl && input === "c") { onSelect({ kind: "quit" }); return true; }

    // Global Ctrl+ shortcuts
    if (key.ctrl && input === "a") { onSelect({ kind: "active" }); return true; }
    if (key.ctrl && input === "r") { onSelect({ kind: "restart" }); return true; }
    if (key.ctrl && input === "q") { onSelect({ kind: "quit" }); return true; }

    // Filter activation (also re-enter filter mode if a filter was committed)
    if (input === "/") { setFilterMode(true); return true; }

    // Tab navigation is disabled while a filter is active — results span all tabs
    if (!filtering) {
      if (key.leftArrow) { switchTab(activeTab - 1); return true; }
      if (key.rightArrow) { switchTab(activeTab + 1); return true; }
      if (key.tab && !key.shift) { switchTab(activeTab + 1); return true; }
      if (key.tab && key.shift) { switchTab(activeTab - 1); return true; }

      if (input && /^[a-z]$/i.test(input)) {
        const i = tabs.findIndex((t) => t.hotkey === input.toLowerCase());
        if (i !== -1) { switchTab(i); return true; }
      }
    }

    // Item hotkeys (1-9 within active tab)
    if (input && /^[1-9]$/.test(input)) {
      const idx = parseInt(input, 10) - 1;
      const item = decoratedItems[idx];
      if (item) {
        onSelect({ kind: "flow", flowKey: item.value });
        return true;
      }
    }

    return false;
  };

  const handleCancel = () => {
    onSelect({ kind: "quit" });
  };

  if (tabs.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
        <Text>no flows configured</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray">
      <TabBar tabs={tabs} activeIndex={activeTab} muted={filtering} />
      <Box paddingX={2}>
        <Text dimColor>──────</Text>
      </Box>

      <Box>
        <Box flexDirection="column" width={wide ? "55%" : "100%"} paddingY={1}>
          {(filterMode || filter) ? <FilterRow value={filter} active={filterMode} /> : null}
          <Select
            items={decoratedItems}
            onSelect={(flowKey) => onSelect({ kind: "flow", flowKey })}
            onCancel={handleCancel}
            onHover={(flowKey) => setHoveredKey(flowKey)}
            onKey={handleKey}
            renderItem={renderItem}
          />
        </Box>
        {wide ? (
          <Box width="45%" flexDirection="column" borderStyle="single" borderColor="gray" borderTop={false} borderBottom={false} borderRight={false}>
            <Preview flowKey={hoveredKey} config={config} />
          </Box>
        ) : null}
      </Box>

      <Box borderStyle="single" borderColor="gray" borderTop borderBottom={false} borderLeft={false} borderRight={false} />
      <Box flexDirection="column" paddingY={1}>
        <StatusBar utils={utils} />
        <ShortcutBar />
      </Box>
    </Box>
  );
}
