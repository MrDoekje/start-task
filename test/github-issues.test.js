import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("axios", () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { createGitHubIssuesProvider } from "../lib/providers/tickets/github-issues.js";

describe("createGitHubIssuesProvider", () => {
  it("throws if token is missing", () => {
    expect(() => createGitHubIssuesProvider({ owner: "o", repo: "r" })).toThrow("token");
  });

  it("throws if owner is missing", () => {
    expect(() => createGitHubIssuesProvider({ token: "t", repo: "r" })).toThrow("owner");
  });

  it("throws if repo is missing", () => {
    expect(() => createGitHubIssuesProvider({ token: "t", owner: "o" })).toThrow("repo");
  });

  it("returns provider with expected shape", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(typeof provider.parseTicketKey).toBe("function");
    expect(typeof provider.fetchTicket).toBe("function");
    expect(provider.ticketKeyPattern).toBeInstanceOf(RegExp);
  });

  it("ticketKeyPattern matches #42", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.ticketKeyPattern.test("#42")).toBe(true);
  });

  it("ticketKeyPattern matches 42", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.ticketKeyPattern.test("42")).toBe(true);
  });

  it("ticketKeyPattern rejects abc", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.ticketKeyPattern.test("abc")).toBe(false);
  });

  it("parseTicketKey strips #", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.parseTicketKey("#42")).toBe("42");
  });

  it("parseTicketKey extracts from URL", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.parseTicketKey("https://github.com/owner/repo/issues/99")).toBe("99");
  });

  it("parseTicketKey returns null/undefined as-is", () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    expect(provider.parseTicketKey(null)).toBe(null);
    expect(provider.parseTicketKey(undefined)).toBe(undefined);
  });

  it("fetchTicket returns correct Ticket", async () => {
    const provider = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
    mockGet.mockResolvedValueOnce({
      data: {
        title: "Fix bug",
        body: "desc",
        state: "open",
        labels: [{ name: "bug" }],
      },
    });

    const ticket = await provider.fetchTicket("42");
    expect(ticket).toEqual({
      key: "#42",
      summary: "Fix bug",
      description: "desc",
      status: "open",
      issueType: "bug",
    });
  });
});
