import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("axios", () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { createLinearProvider } from "../lib/providers/tickets/linear.js";

describe("createLinearProvider", () => {
  it("throws if apiKey is missing", () => {
    expect(() => createLinearProvider({})).toThrow("apiKey");
  });

  it("returns provider with expected shape", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(typeof provider.parseTicketKey).toBe("function");
    expect(typeof provider.fetchTicket).toBe("function");
    expect(provider.ticketKeyPattern).toBeInstanceOf(RegExp);
  });

  it("ticketKeyPattern matches PROJ-123", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.ticketKeyPattern.test("PROJ-123")).toBe(true);
  });

  it("ticketKeyPattern rejects 123", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.ticketKeyPattern.test("123")).toBe(false);
  });

  it("ticketKeyPattern rejects proj-123", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.ticketKeyPattern.test("proj-123")).toBe(false);
  });

  it("parseTicketKey returns matching key as-is", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.parseTicketKey("PROJ-123")).toBe("PROJ-123");
  });

  it("parseTicketKey extracts from URL /issue/PROJ-123", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.parseTicketKey("https://linear.app/team/issue/PROJ-123")).toBe("PROJ-123");
  });

  it("parseTicketKey returns null/undefined as-is", () => {
    const provider = createLinearProvider({ apiKey: "k" });
    expect(provider.parseTicketKey(null)).toBe(null);
    expect(provider.parseTicketKey(undefined)).toBe(undefined);
  });

  it("fetchTicket returns correct Ticket", async () => {
    const provider = createLinearProvider({ apiKey: "k" });
    mockPost.mockResolvedValueOnce({
      data: {
        data: {
          issue: {
            identifier: "ENG-42",
            title: "Fix",
            description: "desc",
            state: { name: "In Progress" },
            labels: { nodes: [{ name: "bug" }] },
          },
        },
      },
    });

    const ticket = await provider.fetchTicket("ENG-42");
    expect(ticket).toEqual({
      key: "ENG-42",
      summary: "Fix",
      description: "desc",
      status: "In Progress",
      issueType: "bug",
    });
  });
});
