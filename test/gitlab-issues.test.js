import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("axios", () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { createGitLabIssuesProvider } from "../lib/providers/tickets/gitlab-issues.js";

describe("createGitLabIssuesProvider", () => {
  it("throws if apiUrl is missing", () => {
    expect(() => createGitLabIssuesProvider({ token: "t", projectPath: "g/p" })).toThrow("apiUrl");
  });

  it("throws if token is missing", () => {
    expect(() => createGitLabIssuesProvider({ apiUrl: "u", projectPath: "g/p" })).toThrow("token");
  });

  it("throws if projectPath is missing", () => {
    expect(() => createGitLabIssuesProvider({ apiUrl: "u", token: "t" })).toThrow("projectPath");
  });

  it("returns provider with expected shape", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(typeof provider.parseTicketKey).toBe("function");
    expect(typeof provider.fetchTicket).toBe("function");
    expect(provider.ticketKeyPattern).toBeInstanceOf(RegExp);
  });

  it("ticketKeyPattern matches #42", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.ticketKeyPattern.test("#42")).toBe(true);
  });

  it("ticketKeyPattern matches 42", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.ticketKeyPattern.test("42")).toBe(true);
  });

  it("ticketKeyPattern rejects abc", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.ticketKeyPattern.test("abc")).toBe(false);
  });

  it("parseTicketKey strips #", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.parseTicketKey("#42")).toBe("42");
  });

  it("parseTicketKey extracts from URL", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.parseTicketKey("https://gitlab.com/group/project/-/issues/99")).toBe("99");
  });

  it("parseTicketKey returns null/undefined as-is", () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    expect(provider.parseTicketKey(null)).toBe(null);
    expect(provider.parseTicketKey(undefined)).toBe(undefined);
  });

  it("fetchTicket returns correct Ticket", async () => {
    const provider = createGitLabIssuesProvider({ apiUrl: "u", token: "t", projectPath: "g/p" });
    mockGet.mockResolvedValueOnce({
      data: {
        title: "Fix",
        description: "desc",
        state: "opened",
        labels: ["bug"],
      },
    });

    const ticket = await provider.fetchTicket("42");
    expect(ticket).toEqual({
      key: "#42",
      summary: "Fix",
      description: "desc",
      status: "opened",
      issueType: "bug",
    });
  });
});
