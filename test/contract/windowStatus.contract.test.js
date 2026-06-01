/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: how a session window's display state is derived, and when two
 * window lists are considered equal for re-render purposes.
 */
import { describe, it, expect } from "vitest";
import { windowState, sameWindows } from "../../lib/tui-ink/windowStatus.js";

describe("windowState", () => {
  it("is 'attached' when the window is active, regardless of status", () => {
    expect(windowState({ active: true, status: "running" })).toBe("attached");
    expect(windowState({ active: true, status: "exited" })).toBe("attached");
  });

  it("is 'running' for an inactive running window", () => {
    expect(windowState({ active: false, status: "running" })).toBe("running");
  });

  it("is 'idle' for an inactive non-running window", () => {
    expect(windowState({ active: false, status: "exited" })).toBe("idle");
    expect(windowState({ status: undefined })).toBe("idle");
    expect(windowState({})).toBe("idle");
  });
});

describe("sameWindows", () => {
  const w = (over = {}) => ({ name: "a", status: "running", active: false, paneCount: 1, ...over });

  it("is true for the same reference", () => {
    const list = [w()];
    expect(sameWindows(list, list)).toBe(true);
  });

  it("is true for distinct but field-equal lists", () => {
    expect(sameWindows([w()], [w()])).toBe(true);
  });

  it("is false when lengths differ", () => {
    expect(sameWindows([w()], [w(), w({ name: "b" })])).toBe(false);
  });

  it("is false when any compared field differs", () => {
    expect(sameWindows([w()], [w({ name: "b" })])).toBe(false);
    expect(sameWindows([w()], [w({ status: "exited" })])).toBe(false);
    expect(sameWindows([w()], [w({ active: true })])).toBe(false);
    expect(sameWindows([w()], [w({ paneCount: 2 })])).toBe(false);
  });

  it("ignores fields outside the compared set", () => {
    expect(sameWindows([w({ extra: 1 })], [w({ extra: 999 })])).toBe(true);
  });
});
