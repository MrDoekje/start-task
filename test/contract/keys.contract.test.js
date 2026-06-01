/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: the "cancel / back" chord is Esc OR Ctrl+C, treated identically by
 * every screen. Any UI must map both to the same intent.
 */
import { describe, it, expect } from "vitest";
import { isCancel } from "../../lib/tui-ink/keys.js";

describe("isCancel", () => {
  it("is true for Escape", () => {
    expect(isCancel("", { escape: true })).toBe(true);
  });

  it("is true for Ctrl+C", () => {
    expect(isCancel("c", { ctrl: true })).toBe(true);
  });

  it("is false for Ctrl with a different letter", () => {
    expect(isCancel("x", { ctrl: true })).toBeFalsy();
  });

  it("is false for a plain 'c' with no ctrl", () => {
    expect(isCancel("c", {})).toBeFalsy();
  });

  it("is false for an unrelated key", () => {
    expect(isCancel("a", { ctrl: false, escape: false })).toBeFalsy();
  });
});
