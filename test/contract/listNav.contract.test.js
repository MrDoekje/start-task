/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: keyboard-list navigation. Disabled items are section headers /
 * separators and are skipped. Any UI rendering a navigable list must obey these
 * cursor rules (wrapping, disabled-skipping) and filtering semantics.
 */
import { describe, it, expect } from "vitest";
import {
  initialEnabledIndex,
  prevEnabledIndex,
  nextEnabledIndex,
  filterByLabel,
  filterByLabelOrValue,
  clampCursor,
  toggleValue,
} from "../../lib/tui-ink/listNav.js";

const items = [
  { label: "Header", disabled: true },
  { label: "Alpha" },
  { label: "Beta" },
  { label: "Sep", disabled: true },
  { label: "Gamma" },
];

describe("initialEnabledIndex", () => {
  it("honors a valid enabled initialIndex", () => {
    expect(initialEnabledIndex(items, 2)).toBe(2);
  });

  it("falls back to the first enabled item when initialIndex is disabled", () => {
    expect(initialEnabledIndex(items, 0)).toBe(1);
    expect(initialEnabledIndex(items, 3)).toBe(1);
  });

  it("defaults initialIndex to 0", () => {
    expect(initialEnabledIndex([{ label: "x" }])).toBe(0);
  });

  it("returns -1 when every item is disabled", () => {
    expect(initialEnabledIndex([{ disabled: true }, { disabled: true }])).toBe(-1);
  });
});

describe("prevEnabledIndex", () => {
  it("skips disabled items moving up", () => {
    expect(prevEnabledIndex(items, 4)).toBe(2); // skips index 3 (Sep)
    expect(prevEnabledIndex(items, 2)).toBe(1);
  });

  it("wraps to the last enabled item when nothing is above (default)", () => {
    expect(prevEnabledIndex(items, 1)).toBe(4);
  });

  it("does not wrap when wrap:false", () => {
    expect(prevEnabledIndex(items, 1, { wrap: false })).toBe(1);
  });

  it("returns the same index when it is the only enabled item", () => {
    const one = [{ disabled: true }, { label: "only" }, { disabled: true }];
    expect(prevEnabledIndex(one, 1)).toBe(1);
  });
});

describe("nextEnabledIndex", () => {
  it("skips disabled items moving down", () => {
    expect(nextEnabledIndex(items, 2)).toBe(4); // skips index 3 (Sep)
    expect(nextEnabledIndex(items, 1)).toBe(2);
  });

  it("wraps to the first enabled item when nothing is below (default)", () => {
    expect(nextEnabledIndex(items, 4)).toBe(1);
  });

  it("does not wrap when wrap:false", () => {
    expect(nextEnabledIndex(items, 4, { wrap: false })).toBe(4);
  });
});

describe("filterByLabel", () => {
  it("returns the list unchanged for an empty filter", () => {
    expect(filterByLabel(items, "")).toBe(items);
  });

  it("matches case-insensitively on label and drops disabled items", () => {
    expect(filterByLabel(items, "a").map((i) => i.label)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("uses a custom match accessor when provided", () => {
    const data = [{ label: "x", tag: "apple" }, { label: "y", tag: "pear" }];
    expect(filterByLabel(data, "app", (it) => it.tag).map((i) => i.label)).toEqual(["x"]);
  });
});

describe("filterByLabelOrValue", () => {
  const opts = [
    { value: "us-east", label: "Virginia" },
    { value: "eu-west", label: "Ireland" },
  ];

  it("returns options unchanged for an empty filter", () => {
    expect(filterByLabelOrValue(opts, "")).toBe(opts);
  });

  it("matches the label", () => {
    expect(filterByLabelOrValue(opts, "ire").map((o) => o.value)).toEqual(["eu-west"]);
  });

  it("matches the stringified value", () => {
    expect(filterByLabelOrValue(opts, "east").map((o) => o.value)).toEqual(["us-east"]);
  });

  it("stringifies non-string values before matching", () => {
    const numeric = [{ value: 42, label: "answer" }, { value: 7, label: "lucky" }];
    expect(filterByLabelOrValue(numeric, "4").map((o) => o.value)).toEqual([42]);
  });
});

describe("clampCursor", () => {
  it("clamps to the last index", () => {
    expect(clampCursor(9, 3)).toBe(2);
  });

  it("never goes negative for an empty list", () => {
    expect(clampCursor(5, 0)).toBe(0);
    expect(clampCursor(0, 0)).toBe(0);
  });

  it("leaves an in-range cursor untouched", () => {
    expect(clampCursor(1, 4)).toBe(1);
  });
});

describe("toggleValue", () => {
  it("adds a missing value and returns a new Set", () => {
    const a = new Set(["x"]);
    const b = toggleValue(a, "y");
    expect([...b]).toEqual(["x", "y"]);
    expect(b).not.toBe(a);
    expect([...a]).toEqual(["x"]); // original untouched
  });

  it("removes a present value", () => {
    expect([...toggleValue(new Set(["x", "y"]), "x")]).toEqual(["y"]);
  });
});
