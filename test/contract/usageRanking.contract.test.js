/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: how "recently/frequently used" flows are ranked. This is the pure
 * ranking function; disk persistence (loadUsage/recordUsage) is intentionally
 * not exercised here because it is environment-dependent.
 */
import { describe, it, expect } from "vitest";
import { topFlowKeys } from "../../lib/usageStore.js";

describe("topFlowKeys", () => {
  const usage = {
    a: { count: 3, lastUsed: 1 },
    b: { count: 5, lastUsed: 2 },
    c: { count: 5, lastUsed: 9 },
    removed: { count: 99, lastUsed: 100 },
  };
  const available = new Set(["a", "b", "c"]);

  it("returns [] for a non-positive limit", () => {
    expect(topFlowKeys(usage, available, 0)).toEqual([]);
    expect(topFlowKeys(usage, available, -1)).toEqual([]);
  });

  it("ranks by count descending", () => {
    expect(topFlowKeys(usage, available, 1)).toEqual(["c"]);
  });

  it("breaks count ties by most recent use", () => {
    // b and c both have count 5; c was used more recently
    expect(topFlowKeys(usage, available, 2)).toEqual(["c", "b"]);
  });

  it("excludes keys not in availableKeys (e.g. flows that no longer exist)", () => {
    expect(topFlowKeys(usage, available, 10)).toEqual(["c", "b", "a"]);
  });

  it("caps the result at the limit", () => {
    expect(topFlowKeys(usage, available, 2)).toHaveLength(2);
  });

  it("returns [] for empty usage", () => {
    expect(topFlowKeys({}, available, 5)).toEqual([]);
  });
});
