import { describe, it, expect } from "vitest";
import { markdownSections, taskHeader, fieldSections } from "../lib/presets/prompts.js";

describe("markdownSections", () => {
  it("renders headings with body content", () => {
    const result = markdownSections([
      { heading: "Description", body: "Something is broken." },
      { heading: "Details", body: "- Type: Bug\n- Priority: High" },
    ]);
    expect(result).toContain("## Description\nSomething is broken.\n");
    expect(result).toContain("## Details\n- Type: Bug\n- Priority: High\n");
  });

  it("skips sections with falsy body", () => {
    const result = markdownSections([
      { heading: "Description", body: "Present." },
      { heading: "Criteria", body: "" },
      { heading: "Outline", body: null },
      { heading: "Notes", body: undefined },
    ]);
    expect(result).toContain("## Description");
    expect(result).not.toContain("## Criteria");
    expect(result).not.toContain("## Outline");
    expect(result).not.toContain("## Notes");
  });

  it("returns empty string for all-falsy sections", () => {
    const result = markdownSections([
      { heading: "Empty", body: "" },
      { heading: "Null", body: null },
    ]);
    expect(result).toBe("");
  });

  it("handles single section", () => {
    const result = markdownSections([{ heading: "MR", body: "https://example.com/mr/1" }]);
    expect(result).toBe("## MR\nhttps://example.com/mr/1\n");
  });

  it("separates sections with blank lines", () => {
    const result = markdownSections([
      { heading: "A", body: "first" },
      { heading: "B", body: "second" },
    ]);
    expect(result).toBe("## A\nfirst\n\n## B\nsecond\n");
  });
});

describe("taskHeader", () => {
  it("builds a header line with verb, key, and summary", () => {
    expect(taskHeader("work on", "PROJ-42", "Fix login bug")).toBe(
      'I need you to work on PROJ-42: "Fix login bug"\n\n',
    );
  });

  it("works with any verb", () => {
    expect(taskHeader("investigate", "GH-7", "Slow queries")).toBe(
      'I need you to investigate GH-7: "Slow queries"\n\n',
    );
  });
});

describe("fieldSections", () => {
  const obj = { title: "My Task", desc: "Details here", empty: "", status: "open", type: "bug" };

  it("maps string field names to sections", () => {
    const result = fieldSections(obj, [
      { heading: "Title", field: "title" },
      { heading: "Description", field: "desc" },
    ]);
    expect(result).toBe("## Title\nMy Task\n\n## Description\nDetails here\n");
  });

  it("maps function fields to sections", () => {
    const result = fieldSections(obj, [
      { heading: "Info", field: (o) => `- Status: ${o.status}\n- Type: ${o.type}` },
    ]);
    expect(result).toBe("## Info\n- Status: open\n- Type: bug\n");
  });

  it("skips fields with falsy values", () => {
    const result = fieldSections(obj, [
      { heading: "Title", field: "title" },
      { heading: "Empty", field: "empty" },
      { heading: "Missing", field: "nonexistent" },
    ]);
    expect(result).toBe("## Title\nMy Task\n");
  });

  it("mixes string and function fields", () => {
    const result = fieldSections(obj, [
      { heading: "Description", field: "desc" },
      { heading: "Meta", field: (o) => `${o.type} (${o.status})` },
    ]);
    expect(result).toContain("## Description\nDetails here\n");
    expect(result).toContain("## Meta\nbug (open)\n");
  });
});
