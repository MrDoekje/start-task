/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: how the flow preview resolves steps and summarizes a flow's
 * effective options into label/value rows.
 */
import { describe, it, expect } from "vitest";
import { resolveStep, summarizeOptions, stepLabel } from "../../lib/tui-ink/previewModel.js";

describe("resolveStep", () => {
  const config = { steps: { ticket: { type: "text", key: "ticketKey" } } };

  it("resolves a string key against config.steps", () => {
    expect(resolveStep("ticket", config)).toBe(config.steps.ticket);
  });

  it("returns an inline step object as-is", () => {
    const inline = { type: "select" };
    expect(resolveStep(inline, config)).toBe(inline);
  });

  it("returns undefined for an unknown key", () => {
    expect(resolveStep("nope", config)).toBeUndefined();
    expect(resolveStep("nope", {})).toBeUndefined();
  });
});

describe("summarizeOptions", () => {
  it("always includes the group, defaulting to 'Other'", () => {
    expect(summarizeOptions({}, {})).toEqual([["group", "Other"]]);
    expect(summarizeOptions({}, { group: "Work" })).toEqual([["group", "Work"]]);
  });

  it("includes agent/git/tracker names when present", () => {
    const config = {
      agent: { name: "claude" },
      git: { name: "gitlab" },
      taskProvider: { name: "jira" },
    };
    expect(summarizeOptions(config, { group: "Work" })).toEqual([
      ["group", "Work"],
      ["agent", "claude"],
      ["git", "gitlab"],
      ["tracker", "jira"],
    ]);
  });

  it("falls back to 'configured' for git/tracker without a name", () => {
    expect(summarizeOptions({ git: {}, taskProvider: {} }, {})).toEqual([
      ["group", "Other"],
      ["git", "configured"],
      ["tracker", "configured"],
    ]);
  });

  it("shows worktree only when enabled", () => {
    expect(summarizeOptions({ worktree: { enabled: true } }, {})).toEqual([
      ["group", "Other"],
      ["worktree", "enabled"],
    ]);
    expect(summarizeOptions({ worktree: { enabled: false } }, {})).toEqual([["group", "Other"]]);
  });

  it("lets flow.options shallow-override config", () => {
    const config = { agent: { name: "claude" } };
    const flow = { group: "Work", options: { agent: { name: "gemini" } } };
    expect(summarizeOptions(config, flow)).toEqual([
      ["group", "Work"],
      ["agent", "gemini"],
    ]);
  });
});

describe("stepLabel", () => {
  it("returns empty string for a missing step", () => {
    expect(stepLabel(null)).toBe("");
    expect(stepLabel(undefined)).toBe("");
  });

  it("strips a trailing colon", () => {
    expect(stepLabel({ message: "Ticket key:" })).toBe("Ticket key");
  });

  it("strips a trailing (optional…) tail", () => {
    expect(stepLabel({ message: "Extra context (optional, ^E for editor)" })).toBe("Extra context");
  });

  it("falls back to the key when there is no message", () => {
    expect(stepLabel({ key: "baseBranch" })).toBe("baseBranch");
  });
});
