import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { ACCENT, OK } from "./theme.js";
import { sameWindows, windowState } from "./windowStatus.js";

const STATUS_GLYPH = {
  running: { glyph: "●", color: OK },
  attached: { glyph: "◉", color: ACCENT },
  idle: { glyph: "○", color: "gray" },
};

function statusFor(w) {
  return STATUS_GLYPH[windowState(w)];
}

export default function StatusBar({ utils, refreshInterval = 5000 }) {
  // listWindows() can shell out (e.g. cmux/tmux) and block the event loop.
  // Defer via setImmediate so the current render commits first.
  const [windows, setWindows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      setImmediate(() => {
        if (cancelled) return;
        try {
          const next = utils.listWindows();
          setWindows((prev) => (sameWindows(prev, next) ? prev : next));
        } catch { /* ignore tmux/cmux blips */ }
      });
    };
    tick();
    const id = setInterval(tick, refreshInterval);
    return () => { cancelled = true; clearInterval(id); };
  }, [utils, refreshInterval]);

  if (!windows.length) {
    return (
      <Box paddingX={2}>
        <Text dimColor>no active windows</Text>
      </Box>
    );
  }

  // Show up to 4 windows inline; condense the rest into "+N more"
  const shown = windows.slice(0, 4);
  const extra = windows.length - shown.length;

  return (
    <Box paddingX={2}>
      <Text color={OK}>● </Text>
      <Text>{windows.length} active</Text>
      <Text dimColor>   </Text>
      {shown.map((w, i) => {
        const s = statusFor(w);
        return (
          <Box key={w.name}>
            {i > 0 ? <Text dimColor>   </Text> : null}
            <Text color={s.color}>{s.glyph} </Text>
            <Text>{w.name}</Text>
          </Box>
        );
      })}
      {extra > 0 ? <Text dimColor>   +{extra} more</Text> : null}
    </Box>
  );
}
