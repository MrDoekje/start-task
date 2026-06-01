import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import Select from "./Select.jsx";
import { isCancel } from "./keys.js";
import { ACCENT, OK } from "./theme.js";
import { sameWindows, windowState } from "./windowStatus.js";

const GLYPH = {
  attached: { glyph: "◉", color: ACCENT },
  running: { glyph: "●", color: OK },
  idle: { glyph: "○", color: "gray" },
};

function glyphFor(w) {
  return GLYPH[windowState(w)];
}

function renderRow(item, active) {
  return (
    <Box>
      <Text color={active ? ACCENT : undefined}>{active ? "▌ " : "  "}</Text>
      <Text color={item.glyphColor}>{item.glyph} </Text>
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

function safeList(utils) {
  try { return utils.listWindows(); } catch { return []; }
}

export default function ActiveTasks({ utils, onExit }) {
  const [windows, setWindows] = useState([]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      setImmediate(() => {
        if (cancelled) return;
        const next = safeList(utils);
        setWindows((prev) => (sameWindows(prev, next) ? prev : next));
      });
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => { cancelled = true; clearInterval(id); };
  }, [utils]);

  // Esc / Ctrl+C backs out; x/d closes the cursor window.
  useInput((input, key) => {
    if (isCancel(input, key)) return onExit();
    if (windows.length === 0) return;
    const target = windows[Math.min(cursor, windows.length - 1)];
    if (!target) return;
    if (input === "x" || input === "d") {
      utils.closeWindow(target.name);
      const next = safeList(utils);
      setWindows((prev) => (sameWindows(prev, next) ? prev : next));
    }
  });

  const items = useMemo(
    () => windows.map((w) => {
      const { glyph, color } = glyphFor(w);
      return {
        value: w.name,
        label: w.name,
        hint: `${w.status}  ·  ${w.paneCount} panes${w.active ? "  ·  focused" : ""}`,
        glyph,
        glyphColor: color,
      };
    }),
    [windows],
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray">
      <Box justifyContent="space-between" paddingX={2} paddingY={1}>
        <Box>
          <Text color={ACCENT}>▌ </Text>
          <Text bold>active tasks</Text>
        </Box>
        <Text dimColor>{windows.length} window{windows.length === 1 ? "" : "s"}</Text>
      </Box>

      <Box paddingX={2} paddingBottom={1}>
        {windows.length === 0 ? (
          <Box flexDirection="column">
            <Text dimColor>no active task windows</Text>
          </Box>
        ) : (
          <Select
            items={items}
            onHover={(_, item) => {
              const i = windows.findIndex((w) => w.name === item.value);
              if (i >= 0) setCursor(i);
            }}
            onSelect={(name) => {
              utils.switchToWindow(name);
              onExit();
            }}
            onCancel={onExit}
            renderItem={renderRow}
          />
        )}
      </Box>

      <Box paddingX={2} paddingBottom={1}>
        <Text dimColor>↵ </Text>
        <Text>switch</Text>
        <Text dimColor>   x </Text>
        <Text>close</Text>
        <Text dimColor>   esc </Text>
        <Text>back</Text>
      </Box>
    </Box>
  );
}
