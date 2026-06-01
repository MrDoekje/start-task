/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: the reusable wizard steps. Their type/key/optional/required
 * metadata and validate/transform/postValidate behavior are what the wizard
 * (any UI) drives. A future UI re-renders these; it must not change them.
 */
import { describe, it, expect } from "vitest";
import { ticketKeyStep } from "../../lib/presets/steps/ticket.js";
import { projectKeysStep, baseBranchStep, userContextStep } from "../../lib/presets/steps/common.js";

describe("ticketKeyStep", () => {
  const config = {
    taskProvider: {
      parseTicketKey: (v) => v.toUpperCase(),
      ticketKeyPattern: /^[A-Z]+-\d+$/,
    },
  };

  it("is a text step keyed on ticketKey", () => {
    expect(ticketKeyStep).toMatchObject({ type: "text", key: "ticketKey" });
  });

  it("requires a non-empty value", () => {
    expect(ticketKeyStep.validate("")).toBe("Ticket key is required.");
    expect(ticketKeyStep.validate("   ")).toBe("Ticket key is required.");
    expect(ticketKeyStep.validate("PROJ-1")).toBeUndefined();
  });

  it("transforms via the task provider on the trimmed value", () => {
    expect(ticketKeyStep.transform("  proj-1 ", {}, config)).toBe("PROJ-1");
  });

  it("post-validates the transformed value against the provider pattern", () => {
    expect(ticketKeyStep.postValidate("PROJ-1", {}, config)).toBeUndefined();
    expect(ticketKeyStep.postValidate("nonsense", {}, config)).toBe("Invalid ticket key format.");
  });
});

describe("projectKeysStep", () => {
  it("is a required multiselect keyed on projectKeys", () => {
    expect(projectKeysStep).toMatchObject({ type: "multiselect", key: "projectKeys", required: true });
  });

  it("derives its options from config.projects keys", () => {
    expect(projectKeysStep.options({ projects: { web: {}, api: {} } })).toEqual([
      { value: "web", label: "web" },
      { value: "api", label: "api" },
    ]);
  });
});

describe("baseBranchStep", () => {
  it("is an optional text step keyed on baseBranch", () => {
    expect(baseBranchStep).toMatchObject({ type: "text", key: "baseBranch", optional: true });
  });

  it("trims to a value or yields undefined when blank", () => {
    expect(baseBranchStep.transform("  develop ")).toBe("develop");
    expect(baseBranchStep.transform("   ")).toBeUndefined();
    expect(baseBranchStep.transform(undefined)).toBeUndefined();
  });
});

describe("userContextStep", () => {
  it("is an optional multiline step keyed on userContext", () => {
    expect(userContextStep).toMatchObject({ type: "multiline", key: "userContext", optional: true });
  });
});
