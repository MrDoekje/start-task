import { describe, it, expect } from "vitest";
import { extractTextFromADF, extractFieldText, createJiraProvider } from "../lib/providers/jira.js";

describe("extractTextFromADF", () => {
  it("returns empty string for null/undefined", () => {
    expect(extractTextFromADF(null)).toBe("");
    expect(extractTextFromADF(undefined)).toBe("");
  });

  it("returns string input as-is", () => {
    expect(extractTextFromADF("plain text")).toBe("plain text");
  });

  it("extracts text from text node", () => {
    expect(extractTextFromADF({ type: "text", text: "hello" })).toBe("hello");
  });

  it("converts hardBreak to newline", () => {
    expect(extractTextFromADF({ type: "hardBreak" })).toBe("\n");
  });

  it("extracts URL from inlineCard", () => {
    expect(extractTextFromADF({ type: "inlineCard", attrs: { url: "https://example.com" } })).toBe(
      "https://example.com",
    );
  });

  it("extracts text from paragraph", () => {
    const node = {
      type: "paragraph",
      content: [{ type: "text", text: "hello world" }],
    };
    expect(extractTextFromADF(node)).toBe("hello world\n");
  });

  it("extracts text from nested list", () => {
    const node = {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "item one" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "item two" }] }],
        },
      ],
    };
    const result = extractTextFromADF(node);
    expect(result).toContain("- item one");
    expect(result).toContain("- item two");
  });
});

describe("extractFieldText", () => {
  it("returns empty string for null/undefined", () => {
    expect(extractFieldText(null)).toBe("");
    expect(extractFieldText(undefined)).toBe("");
  });

  it("returns string as-is", () => {
    expect(extractFieldText("plain text")).toBe("plain text");
  });

  it("extracts text from ADF object", () => {
    const adf = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "from ADF" }] }],
    };
    expect(extractFieldText(adf)).toContain("from ADF");
  });

  it("returns empty string for object without type", () => {
    expect(extractFieldText({ foo: "bar" })).toBe("");
  });
});

describe("createJiraProvider", () => {
  it("throws if apiUrl is missing", () => {
    expect(() => createJiraProvider({ email: "e", token: "t" })).toThrow("apiUrl");
  });

  it("throws if email is missing", () => {
    expect(() => createJiraProvider({ apiUrl: "u", token: "t" })).toThrow("email");
  });

  it("throws if token is missing", () => {
    expect(() => createJiraProvider({ apiUrl: "u", email: "e" })).toThrow("token");
  });

  it("returns provider with expected methods", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(typeof provider.parseTicketKey).toBe("function");
    expect(typeof provider.fetchTicket).toBe("function");
    expect(provider.ticketKeyPattern).toBeInstanceOf(RegExp);
  });

  it("parseTicketKey returns plain ticket key as-is", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(provider.parseTicketKey("PROJ-1234")).toBe("PROJ-1234");
  });

  it("parseTicketKey extracts key from Jira browse URL", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(provider.parseTicketKey("https://myorg.atlassian.net/browse/PROJ-5678")).toBe("PROJ-5678");
  });

  it("parseTicketKey extracts key from URL with query params", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(provider.parseTicketKey("https://myorg.atlassian.net/browse/PROJ-99?foo=bar")).toBe(
      "PROJ-99",
    );
  });

  it("parseTicketKey returns null/undefined as-is", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(provider.parseTicketKey(null)).toBe(null);
    expect(provider.parseTicketKey(undefined)).toBe(undefined);
  });

  it("parseTicketKey returns invalid input as-is for downstream validation", () => {
    const provider = createJiraProvider({ apiUrl: "u", email: "e", token: "t" });
    expect(provider.parseTicketKey("not-a-ticket")).toBe("not-a-ticket");
  });
});
