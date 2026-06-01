/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: flow orchestration helpers — resolving step references, deciding
 * whether a wizard would render, and which option-override steps are offered.
 */
import { describe, it, expect } from "vitest";
import { resolveSteps, hasActiveStep, overrideEntries } from "../../lib/tui-ink/flowModel.js";

describe("resolveSteps", () => {
  const config = { steps: { ticket: { type: "text", key: "ticketKey" } } };

  it("resolves string references against config.steps", () => {
    expect(resolveSteps(["ticket"], config)).toEqual([config.steps.ticket]);
  });

  it("passes inline step objects through unchanged", () => {
    const inline = { type: "select", key: "x" };
    expect(resolveSteps([inline], config)[0]).toBe(inline);
  });

  it("throws for an unknown string reference", () => {
    expect(() => resolveSteps(["missing"], config)).toThrow(/Unknown step reference: "missing"/);
  });

  it("throws for a string reference when config has no steps map", () => {
    expect(() => resolveSteps(["ticket"], {})).toThrow(/Unknown step reference/);
  });
});

describe("hasActiveStep", () => {
  const config = {};

  it("is true when a step has no `when`", () => {
    expect(hasActiveStep([{ key: "a" }], config)).toBe(true);
  });

  it("is true when at least one `when` passes with empty results", () => {
    expect(hasActiveStep([{ when: () => false }, { when: () => true }], config)).toBe(true);
  });

  it("is false when every step is gated off for empty results", () => {
    expect(hasActiveStep([{ when: () => false }], config)).toBe(false);
  });

  it("is false for an empty step list", () => {
    expect(hasActiveStep([], config)).toBe(false);
  });

  it("evaluates `when` with empty results", () => {
    expect(hasActiveStep([{ when: (r) => Object.keys(r).length === 0 }], config)).toBe(true);
  });
});

describe("overrideEntries", () => {
  const optionSteps = {
    agent: { label: "Agent" },
    git: { label: "Git" },
  };

  it("returns [] when there are no option steps", () => {
    expect(overrideEntries(undefined, true)).toEqual([]);
    expect(overrideEntries(null, true)).toEqual([]);
  });

  it("returns [] when flowOverrides is exactly false", () => {
    expect(overrideEntries(optionSteps, false)).toEqual([]);
  });

  it("returns all entries when flowOverrides is true or undefined", () => {
    expect(overrideEntries(optionSteps, true).map(([k]) => k)).toEqual(["agent", "git"]);
    expect(overrideEntries(optionSteps, undefined).map(([k]) => k)).toEqual(["agent", "git"]);
  });

  it("excludes only the keys explicitly set to false in an object override", () => {
    expect(overrideEntries(optionSteps, { git: false }).map(([k]) => k)).toEqual(["agent"]);
    expect(overrideEntries(optionSteps, { git: true }).map(([k]) => k)).toEqual(["agent", "git"]);
  });
});
