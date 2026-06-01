/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: how the main menu turns a config (+ usage data) into tabs and
 * items — grouping, the optional "recent" tab, hotkey assignment, item
 * decoration with 1-9 hotkeys, and tab index wrapping.
 *
 * `buildTabs` takes usage as an argument (no disk I/O here) so the contract is
 * deterministic and platform-independent.
 */
import { describe, it, expect } from "vitest";
import {
  resolveFrequentlyUsed,
  pickHotkey,
  buildTabs,
  decorateItems,
  wrapTabIndex,
  MAX_ITEM_HOTKEYS,
} from "../../lib/tui-ink/menuModel.js";

describe("resolveFrequentlyUsed", () => {
  it("disables entirely when the setting is false", () => {
    expect(resolveFrequentlyUsed(false)).toEqual({ enabled: false, count: 0 });
  });

  it("defaults to enabled with count 3 when unset", () => {
    expect(resolveFrequentlyUsed(undefined)).toEqual({ enabled: true, count: 3 });
    expect(resolveFrequentlyUsed({})).toEqual({ enabled: true, count: 3 });
  });

  it("respects an explicit positive integer count", () => {
    expect(resolveFrequentlyUsed({ count: 5 })).toEqual({ enabled: true, count: 5 });
  });

  it("ignores non-positive or non-integer counts (falls back to 3)", () => {
    expect(resolveFrequentlyUsed({ count: 0 }).count).toBe(3);
    expect(resolveFrequentlyUsed({ count: -2 }).count).toBe(3);
    expect(resolveFrequentlyUsed({ count: 2.5 }).count).toBe(3);
  });

  it("can be disabled via { enabled: false } while keeping a count", () => {
    expect(resolveFrequentlyUsed({ enabled: false })).toEqual({ enabled: false, count: 3 });
  });
});

describe("pickHotkey", () => {
  it("picks the first letter of the label when free", () => {
    expect(pickHotkey("setup", [])).toBe("s");
  });

  it("falls through to the next free letter on a clash", () => {
    expect(pickHotkey("setup", [{ hotkey: "s" }])).toBe("e");
  });

  it("skips non-letters", () => {
    expect(pickHotkey("3-way", [])).toBe("w");
  });

  it("returns null when every letter is taken", () => {
    expect(pickHotkey("ab", [{ hotkey: "a" }, { hotkey: "b" }])).toBeNull();
  });
});

describe("buildTabs", () => {
  const config = {
    flows: {
      a: { label: "Alpha", group: "Work" },
      b: { label: "Beta", group: "Work" },
      c: { label: "Gamma" }, // no group → "Other"
    },
  };

  it("builds one tab per group in encounter order, with lowercase ids/labels", () => {
    const tabs = buildTabs(config, {});
    expect(tabs.map((t) => t.id)).toEqual(["work", "other"]);
    expect(tabs[0]).toMatchObject({ label: "work", hotkey: "w" });
    expect(tabs[0].items).toEqual([
      { flowKey: "a", label: "Alpha" },
      { flowKey: "b", label: "Beta" },
    ]);
    expect(tabs[1].items).toEqual([{ flowKey: "c", label: "Gamma" }]);
  });

  it("prepends a 'recent' tab (hotkey r) when usage yields top keys", () => {
    const tabs = buildTabs(config, { a: { count: 5, lastUsed: 100 } });
    expect(tabs[0]).toMatchObject({ id: "recent", label: "recent", hotkey: "r" });
    expect(tabs[0].items).toEqual([{ flowKey: "a", label: "Alpha" }]);
    // recent does NOT dedupe — Alpha still appears in its group tab too
    expect(tabs.find((t) => t.id === "work").items.map((i) => i.flowKey)).toContain("a");
  });

  it("omits the recent tab when frequentlyUsed is disabled", () => {
    const cfg = { ...config, frequentlyUsed: false };
    const tabs = buildTabs(cfg, { a: { count: 5, lastUsed: 100 } });
    expect(tabs.some((t) => t.id === "recent")).toBe(false);
  });

  it("omits the recent tab when there is no usage", () => {
    expect(buildTabs(config, {}).some((t) => t.id === "recent")).toBe(false);
  });
});

describe("decorateItems", () => {
  const flows = {
    a: { label: "Alpha", group: "Work" },
    b: { label: "Beta", group: "Work" },
  };

  it("maps the active tab's items with 1-based hotkeys when not filtering", () => {
    const baseItems = [{ flowKey: "a", label: "Alpha" }, { flowKey: "b", label: "Beta" }];
    expect(decorateItems({ filtering: false, filter: "", baseItems, flows })).toEqual([
      { value: "a", label: "Alpha", hotkey: "1" },
      { value: "b", label: "Beta", hotkey: "2" },
    ]);
  });

  it("searches across all flows (with group hints) when filtering", () => {
    expect(decorateItems({ filtering: true, filter: "alp", baseItems: [], flows })).toEqual([
      { value: "a", label: "Alpha", hint: "work", hotkey: "1" },
    ]);
  });

  it("assigns hotkeys only to the first MAX_ITEM_HOTKEYS rows", () => {
    const baseItems = Array.from({ length: MAX_ITEM_HOTKEYS + 2 }, (_, i) => ({
      flowKey: `f${i}`,
      label: `F${i}`,
    }));
    const decorated = decorateItems({ filtering: false, filter: "", baseItems, flows });
    expect(decorated[MAX_ITEM_HOTKEYS - 1].hotkey).toBe(String(MAX_ITEM_HOTKEYS));
    expect(decorated[MAX_ITEM_HOTKEYS].hotkey).toBeNull();
    expect(decorated[MAX_ITEM_HOTKEYS + 1].hotkey).toBeNull();
  });
});

describe("wrapTabIndex", () => {
  it("wraps below 0 to the last tab", () => {
    expect(wrapTabIndex(-1, 3)).toBe(2);
  });

  it("wraps past the end to the first tab", () => {
    expect(wrapTabIndex(3, 3)).toBe(0);
  });

  it("leaves an in-range index untouched", () => {
    expect(wrapTabIndex(1, 3)).toBe(1);
  });
});
