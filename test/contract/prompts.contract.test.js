/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: prompt-assembly helpers. The exact text these emit becomes the
 * agent prompt, so the shape (headings, blank-line spacing, skipped empties) is
 * the contract any flow relies on.
 */
import { describe, it, expect } from "vitest";
import {
  markdownSections,
  taskHeader,
  fieldSections,
  ticketSections,
  workflowFooter,
} from "../../lib/presets/prompts.js";

describe("markdownSections", () => {
  it("renders heading + body blocks separated by a blank line", () => {
    expect(markdownSections([
      { heading: "A", body: "one" },
      { heading: "B", body: "two" },
    ])).toBe("## A\none\n\n## B\ntwo\n");
  });

  it("skips sections with falsy bodies", () => {
    expect(markdownSections([
      { heading: "A", body: "" },
      { heading: "B", body: "two" },
      { heading: "C", body: null },
    ])).toBe("## B\ntwo\n");
  });
});

describe("taskHeader", () => {
  it("builds a one-line header with a trailing blank line", () => {
    expect(taskHeader("work on", "PROJ-1", "Fix the bug")).toBe(
      `I need you to work on PROJ-1: "Fix the bug"\n\n`,
    );
  });
});

describe("fieldSections", () => {
  it("reads string field keys and calls function fields with the object", () => {
    const ticket = { description: "desc", issueType: "Bug", status: "Open" };
    expect(fieldSections(ticket, [
      { heading: "Description", field: "description" },
      { heading: "Details", field: (t) => `- Type: ${t.issueType}\n- Status: ${t.status}` },
    ])).toBe("## Description\ndesc\n\n## Details\n- Type: Bug\n- Status: Open\n");
  });
});

describe("ticketSections", () => {
  it("renders ticket details and description", () => {
    expect(ticketSections({ issueType: "Bug", status: "Open", description: "Steps to repro" })).toBe(
      "## Ticket Details\n- Type: Bug\n- Status: Open\n\n## Description\nSteps to repro\n",
    );
  });

  it("appends any custom fields as their own sections", () => {
    const out = ticketSections({
      issueType: "Story",
      status: "In Progress",
      description: "d",
      customFields: { "Acceptance Criteria": "AC text" },
    });
    expect(out).toContain("## Acceptance Criteria\nAC text\n");
  });

  it("omits the description section when it is empty", () => {
    const out = ticketSections({ issueType: "Bug", status: "Open", description: "" });
    expect(out).toBe("## Ticket Details\n- Type: Bug\n- Status: Open\n");
  });
});

describe("workflowFooter", () => {
  it("is a string with the workflow and anti-stuck guidance", () => {
    expect(typeof workflowFooter).toBe("string");
    expect(workflowFooter).toContain("## Workflow");
    expect(workflowFooter).toContain("Avoid Getting Stuck");
  });
});
