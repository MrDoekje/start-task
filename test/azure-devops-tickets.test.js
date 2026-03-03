import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("../lib/providers/git/utils.js", () => ({
  createAzureDevOpsClient: vi.fn(() => mockClient),
}));

import { createAzureDevOpsTicketProvider } from "../lib/providers/tickets/azure-devops.js";

describe("createAzureDevOpsTicketProvider", () => {
  it("throws if orgUrl is missing", () => {
    expect(() => createAzureDevOpsTicketProvider({ token: "t", project: "p" })).toThrow("orgUrl");
  });

  it("throws if token is missing", () => {
    expect(() => createAzureDevOpsTicketProvider({ orgUrl: "u", project: "p" })).toThrow("token");
  });

  it("throws if project is missing", () => {
    expect(() => createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t" })).toThrow("project");
  });

  it("returns provider with expected shape", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(typeof provider.parseTicketKey).toBe("function");
    expect(typeof provider.fetchTicket).toBe("function");
    expect(provider.ticketKeyPattern).toBeInstanceOf(RegExp);
  });

  it("ticketKeyPattern matches 42", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(provider.ticketKeyPattern.test("42")).toBe(true);
  });

  it("ticketKeyPattern rejects abc", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(provider.ticketKeyPattern.test("abc")).toBe(false);
  });

  it("ticketKeyPattern rejects PROJ-42", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(provider.ticketKeyPattern.test("PROJ-42")).toBe(false);
  });

  it("parseTicketKey strips #", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(provider.parseTicketKey("#42")).toBe("42");
  });

  it("parseTicketKey extracts from URL /_workitems/edit/42", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(
      provider.parseTicketKey("https://dev.azure.com/org/project/_workitems/edit/42"),
    ).toBe("42");
  });

  it("parseTicketKey returns null/undefined as-is", () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    expect(provider.parseTicketKey(null)).toBe(null);
    expect(provider.parseTicketKey(undefined)).toBe(undefined);
  });

  it("fetchTicket returns correct Ticket with HTML stripped", async () => {
    const provider = createAzureDevOpsTicketProvider({ orgUrl: "u", token: "t", project: "p" });
    mockGet.mockResolvedValueOnce({
      data: {
        fields: {
          "System.Title": "Fix",
          "System.Description": "<p>desc</p>",
          "System.State": "Active",
          "System.WorkItemType": "Bug",
        },
      },
    });

    const ticket = await provider.fetchTicket("42");
    expect(ticket).toEqual({
      key: "42",
      summary: "Fix",
      description: "desc",
      status: "Active",
      issueType: "Bug",
    });
  });
});
