/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: wizard step traversal. A step is shown only when it has no `when`
 * predicate or its `when(results, config)` returns true. Forward/back movement
 * skips inactive steps and reports sentinels at the ends.
 */
import { describe, it, expect } from "vitest";
import { nextActiveIndex, cleanMessage, stepShortcuts } from "../../lib/tui-ink/wizardModel.js";

describe("nextActiveIndex", () => {
  const config = {};
  const steps = [
    { key: "a" },
    { key: "b", when: (r) => r.a === "yes" },
    { key: "c" },
  ];

  it("returns the index itself when the step is active", () => {
    expect(nextActiveIndex(steps, 0, 1, {}, config)).toBe(0);
  });

  it("skips a step whose `when` is false (moving forward)", () => {
    expect(nextActiveIndex(steps, 1, 1, {}, config)).toBe(2);
  });

  it("includes the conditional step once its `when` is true", () => {
    expect(nextActiveIndex(steps, 1, 1, { a: "yes" }, config)).toBe(1);
  });

  it("skips inactive steps moving backward", () => {
    expect(nextActiveIndex(steps, 1, -1, {}, config)).toBe(0);
  });

  it("returns steps.length as the forward sentinel when none remain", () => {
    const allConditional = [{ key: "x", when: () => false }];
    expect(nextActiveIndex(allConditional, 0, 1, {}, config)).toBe(1);
  });

  it("returns -1 as the backward sentinel when none remain", () => {
    const allConditional = [{ key: "x", when: () => false }];
    expect(nextActiveIndex(allConditional, 0, -1, {}, config)).toBe(-1);
  });

  it("passes results and config through to the predicate", () => {
    const seen = [];
    const probe = [{ key: "p", when: (r, c) => { seen.push([r, c]); return true; } }];
    const results = { foo: 1 };
    const cfg = { bar: 2 };
    nextActiveIndex(probe, 0, 1, results, cfg);
    expect(seen[0][0]).toBe(results);
    expect(seen[0][1]).toBe(cfg);
  });
});

describe("cleanMessage", () => {
  it("strips a trailing colon and any whitespace after it", () => {
    expect(cleanMessage("Pick a project:")).toBe("Pick a project");
    expect(cleanMessage("Pick a project:  ")).toBe("Pick a project");
  });

  it("leaves a message without a trailing colon untouched", () => {
    expect(cleanMessage("Pick a project")).toBe("Pick a project");
  });

  it("returns empty string for falsy input", () => {
    expect(cleanMessage("")).toBe("");
    expect(cleanMessage(null)).toBe("");
    expect(cleanMessage(undefined)).toBe("");
  });
});

describe("stepShortcuts", () => {
  it("lists text-step shortcuts and appends 'clean' only when step.clean is set", () => {
    expect(stepShortcuts({ type: "text" })).toEqual([
      ["↵", "continue"], ["^W", "del word"], ["^E", "editor"], ["esc", "back"],
    ]);
    expect(stepShortcuts({ type: "text", clean: () => "" })).toEqual([
      ["↵", "continue"], ["^W", "del word"], ["^E", "editor"], ["tab", "clean"], ["esc", "back"],
    ]);
  });

  it("provides type-specific shortcuts", () => {
    expect(stepShortcuts({ type: "select" })).toEqual([["↵", "select"], ["/", "filter"], ["esc", "back"]]);
    expect(stepShortcuts({ type: "multiselect" })).toEqual([
      ["space", "toggle"], ["↵", "continue"], ["/", "filter"], ["esc", "back"],
    ]);
    expect(stepShortcuts({ type: "multiline" })).toEqual([
      ["↵", "newline"], ["^D", "submit"], ["^W", "del word"], ["esc", "back"],
    ]);
    expect(stepShortcuts({ type: "editor" })).toEqual([["esc", "back"]]);
  });

  it("falls back to just 'back' for unknown step types", () => {
    expect(stepShortcuts({ type: "mystery" })).toEqual([["esc", "back"]]);
  });
});
