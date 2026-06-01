import React, { useMemo, useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { isCancel } from "./keys.js";
import { ACCENT } from "./theme.js";

/**
 * Keyboard-navigable list. Disabled items are skipped during navigation
 * and used to render section headers / separators.
 *
 * Items: { value, label, disabled?, ... } — extra fields pass through to renderItem.
 *
 * Props:
 *   items        – Item[]
 *   onSelect     – (value) => void   on Enter
 *   onCancel     – () => void        on Esc / Ctrl+C
 *   onHover      – (value, item) => void   fires on cursor movement
 *   initialIndex – number            starting cursor (clamped to first enabled item)
 *   renderItem   – (item, active) => ReactNode  custom row renderer
 *   onKey        – (input, key) => true|void    extra key handler (shortcuts)
 *   isActive     – bool              when false, ignore keyboard
 *   filterable   – bool              when true, "/" enters an inline filter mode
 *   filterFields – (item) => string  optional accessor for filter match text (default: label)
 */
export default function Select({
  items,
  onSelect,
  onCancel,
  onHover,
  initialIndex = 0,
  renderItem,
  onKey,
  isActive = true,
  filterable = false,
  filterFields,
}) {
  const [filterMode, setFilterMode] = useState(false);
  const [filter, setFilter] = useState("");

  const visibleItems = useMemo(() => {
    if (!filter) return items;
    const needle = filter.toLowerCase();
    const matchText = (it) => (filterFields ? filterFields(it) : it.label ?? "");
    return items.filter((it) => !it.disabled && matchText(it).toLowerCase().includes(needle));
  }, [items, filter, filterFields]);

  const [index, setIndex] = useState(() => {
    const firstEnabled = visibleItems.findIndex((it) => !it.disabled);
    return visibleItems[initialIndex] && !visibleItems[initialIndex].disabled ? initialIndex : firstEnabled;
  });

  // Snap cursor back to an enabled row when items change (e.g. filter applied)
  useEffect(() => {
    if (!visibleItems[index] || visibleItems[index].disabled) {
      const next = visibleItems.findIndex((it) => !it.disabled);
      if (next !== -1) setIndex(next);
    }
  }, [visibleItems]);

  // Dedupe onHover via ref: parents often rebuild items each render, which would
  // otherwise re-fire this effect with the same focused value.
  const lastHoverRef = useRef(null);
  useEffect(() => {
    const it = visibleItems[index];
    if (!it || it.disabled) return;
    if (lastHoverRef.current === it.value) return;
    lastHoverRef.current = it.value;
    onHover?.(it.value, it);
  }, [index, visibleItems]);

  useInput((input, key) => {
    if (!isActive) return;

    if (filterMode) {
      if (isCancel(input, key)) { setFilterMode(false); setFilter(""); return; }
      if (key.return) {
        const it = visibleItems[index];
        if (it && !it.disabled) onSelect(it.value);
        return;
      }
      if (key.backspace || key.delete) { setFilter(filter.slice(0, -1)); return; }
      if (key.upArrow) {
        for (let i = index - 1; i >= 0; i--) {
          if (!visibleItems[i].disabled) return setIndex(i);
        }
        return;
      }
      if (key.downArrow) {
        for (let i = index + 1; i < visibleItems.length; i++) {
          if (!visibleItems[i].disabled) return setIndex(i);
        }
        return;
      }
      if (input && !key.ctrl && !key.meta) setFilter(filter + input);
      return;
    }

    if (onKey?.(input, key) === true) return;
    if (filterable && input === "/") { setFilterMode(true); return; }
    if (isCancel(input, key)) {
      onCancel?.();
      return;
    }
    if (key.return) {
      const it = visibleItems[index];
      if (it && !it.disabled) onSelect(it.value);
      return;
    }
    if (key.upArrow || (key.ctrl && input === "p")) {
      for (let i = index - 1; i >= 0; i--) {
        if (!visibleItems[i].disabled) return setIndex(i);
      }
      for (let i = visibleItems.length - 1; i > index; i--) {
        if (!visibleItems[i].disabled) return setIndex(i);
      }
    }
    if (key.downArrow || (key.ctrl && input === "n")) {
      for (let i = index + 1; i < visibleItems.length; i++) {
        if (!visibleItems[i].disabled) return setIndex(i);
      }
      for (let i = 0; i < index; i++) {
        if (!visibleItems[i].disabled) return setIndex(i);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {filterable && (filterMode || filter) ? (
        <Box marginBottom={1}>
          <Text dimColor>filter  </Text>
          <Text color={ACCENT}>{filter}</Text>
          {filterMode ? <Text color={ACCENT}>▌</Text> : null}
        </Box>
      ) : null}
      {visibleItems.length === 0 ? (
        <Text dimColor>  no matches</Text>
      ) : (
        visibleItems.map((it, i) => (
          <Box key={i}>{renderItem(it, i === index)}</Box>
        ))
      )}
    </Box>
  );
}
