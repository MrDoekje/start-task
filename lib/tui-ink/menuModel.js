import { topFlowKeys } from "../usageStore.js";

/**
 * Framework-agnostic main-menu model: turns a config (+ usage data) into the
 * tab/item structure the menu renders, independent of any UI toolkit.
 */

/** Max number of 1-9 item hotkeys shown per tab. */
export const MAX_ITEM_HOTKEYS = 9;

/**
 * Normalize the `frequentlyUsed` setting into `{ enabled, count }`.
 * `false` disables it; a missing/invalid count defaults to 3.
 */
export function resolveFrequentlyUsed(setting) {
  if (setting === false) return { enabled: false, count: 0 };
  const enabled = setting?.enabled !== false;
  const count = Number.isInteger(setting?.count) && setting.count > 0 ? setting.count : 3;
  return { enabled, count };
}

/**
 * Pick a single-char hotkey for a tab: the first non-conflicting letter of the
 * label, or null if every letter is taken.
 */
export function pickHotkey(label, existingTabs) {
  const used = new Set(existingTabs.map((t) => t.hotkey));
  for (const ch of label.toLowerCase()) {
    if (/[a-z]/.test(ch) && !used.has(ch)) return ch;
  }
  return null;
}

/**
 * Build the tab list from config and a usage map.
 * Each tab: `{ id, label, hotkey, items: [{ flowKey, label }] }`.
 * The "recent" tab is included only when `frequentlyUsed` yields entries; its
 * items are NOT de-duplicated against group tabs (a flow can appear in both).
 *
 * @param {import("../types.js").Config} config
 * @param {Record<string, { count: number, lastUsed: number }>} usage
 */
export function buildTabs(config, usage) {
  const flowEntries = Object.entries(config.flows);
  const flowByKey = new Map(flowEntries);
  const tabs = [];

  const groups = new Map();
  for (const [key, flow] of flowEntries) {
    const g = flow.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ flowKey: key, flow });
  }

  const { enabled: freqEnabled, count: freqCount } = resolveFrequentlyUsed(config.frequentlyUsed);
  if (freqEnabled) {
    const availableKeys = new Set(flowEntries.map(([key]) => key));
    const topKeys = topFlowKeys(usage, availableKeys, freqCount);
    if (topKeys.length > 0) {
      tabs.push({
        id: "recent",
        label: "recent",
        hotkey: "r",
        items: topKeys.map((k) => ({ flowKey: k, label: flowByKey.get(k).label })),
      });
    }
  }

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
 * Compute the decorated item list for the menu body. When filtering, results
 * span all flows (matched by label); otherwise the active tab's items are used.
 * Each item gets a 1-9 hotkey for the first `maxHotkeys` rows.
 *
 * @param {object} args
 * @param {boolean} args.filtering
 * @param {string} args.filter
 * @param {Array<{flowKey: string, label: string}>} args.baseItems
 * @param {Record<string, {label: string, group?: string}>} args.flows
 * @param {number} [args.maxHotkeys]
 */
export function decorateItems({ filtering, filter, baseItems, flows, maxHotkeys = MAX_ITEM_HOTKEYS }) {
  if (filtering) {
    const needle = filter.toLowerCase();
    return Object.entries(flows)
      .filter(([, flow]) => flow.label.toLowerCase().includes(needle))
      .map(([flowKey, flow], i) => ({
        value: flowKey,
        label: flow.label,
        hint: (flow.group ?? "other").toLowerCase(),
        hotkey: i < maxHotkeys ? String(i + 1) : null,
      }));
  }
  return baseItems.map((it, i) => ({
    value: it.flowKey,
    label: it.label,
    hotkey: i < maxHotkeys ? String(i + 1) : null,
  }));
}

/** Wrap a tab index into [0, length) — left of 0 goes to the end and vice-versa. */
export function wrapTabIndex(next, length) {
  if (next < 0) return length - 1;
  if (next >= length) return 0;
  return next;
}
