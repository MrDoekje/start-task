/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: each task provider's `ticketKeyPattern` and `parseTicketKey` — how
 * a raw user string (plain key, "#"-prefixed number, or a full URL) is
 * normalized to a ticket identifier. Pure: provider construction makes no
 * network calls; these functions never do I/O.
 */
import { describe, it, expect } from "vitest";
import { createJiraProvider } from "../../lib/providers/tickets/jira.js";
import { createLinearProvider } from "../../lib/providers/tickets/linear.js";
import { createGitHubIssuesProvider } from "../../lib/providers/tickets/github-issues.js";
import { createGitLabIssuesProvider } from "../../lib/providers/tickets/gitlab-issues.js";
import { createAzureDevOpsTicketProvider } from "../../lib/providers/tickets/azure-devops.js";

const jira = createJiraProvider({ apiUrl: "https://x", email: "a@b.c", token: "t" });
const linear = createLinearProvider({ apiKey: "k" });
const gh = createGitHubIssuesProvider({ token: "t", owner: "o", repo: "r" });
const gl = createGitLabIssuesProvider({ apiUrl: "https://x", token: "t", projectPath: "g/p" });
const ado = createAzureDevOpsTicketProvider({ orgUrl: "https://dev.azure.com/o", token: "t", project: "p" });

describe("Jira ticket keys", () => {
  it("matches PROJECT-NUMBER", () => {
    expect(jira.ticketKeyPattern.test("PROJ-123")).toBe(true);
    expect(jira.ticketKeyPattern.test("proj-123")).toBe(false);
    expect(jira.ticketKeyPattern.test("PROJ")).toBe(false);
  });

  it("passes a plain key through", () => {
    expect(jira.parseTicketKey("PROJ-123")).toBe("PROJ-123");
  });

  it("extracts the key from a browse URL (query string ignored)", () => {
    expect(jira.parseTicketKey("https://x.atlassian.net/browse/PROJ-123")).toBe("PROJ-123");
    expect(jira.parseTicketKey("https://x.atlassian.net/browse/PROJ-123?focus=1")).toBe("PROJ-123");
  });

  it("returns the input unchanged when it is neither a key nor a matching URL", () => {
    expect(jira.parseTicketKey("just text")).toBe("just text");
    expect(jira.parseTicketKey("https://x.atlassian.net/dashboard")).toBe("https://x.atlassian.net/dashboard");
  });

  it("passes falsy input straight through", () => {
    expect(jira.parseTicketKey("")).toBe("");
    expect(jira.parseTicketKey(null)).toBeNull();
    expect(jira.parseTicketKey(undefined)).toBeUndefined();
  });
});

describe("Linear issue keys", () => {
  it("matches TEAM-NUMBER and extracts from an /issue/ URL", () => {
    expect(linear.ticketKeyPattern.test("ENG-42")).toBe(true);
    expect(linear.parseTicketKey("ENG-42")).toBe("ENG-42");
    expect(linear.parseTicketKey("https://linear.app/acme/issue/ENG-42/some-title")).toBe("ENG-42");
  });

  it("returns non-matching input unchanged", () => {
    expect(linear.parseTicketKey("nope")).toBe("nope");
  });
});

describe.each([
  ["GitHub", gh],
  ["GitLab", gl],
])("%s issue numbers", (_label, provider) => {
  it("accepts a number with optional leading #", () => {
    expect(provider.ticketKeyPattern.test("123")).toBe(true);
    expect(provider.ticketKeyPattern.test("#123")).toBe(true);
    expect(provider.ticketKeyPattern.test("12a")).toBe(false);
  });

  it("strips the leading # to a bare number", () => {
    expect(provider.parseTicketKey("123")).toBe("123");
    expect(provider.parseTicketKey("#123")).toBe("123");
  });

  it("extracts the number from an /issues/ URL", () => {
    expect(provider.parseTicketKey("https://host/o/r/issues/45")).toBe("45");
  });

  it("returns non-numeric, non-URL input unchanged", () => {
    expect(provider.parseTicketKey("abc")).toBe("abc");
  });
});

describe("Azure DevOps work item ids", () => {
  it("matches a bare number only (no #) in the pattern", () => {
    expect(ado.ticketKeyPattern.test("77")).toBe(true);
    expect(ado.ticketKeyPattern.test("#77")).toBe(false);
  });

  it("strips a leading # when parsing", () => {
    expect(ado.parseTicketKey("#77")).toBe("77");
    expect(ado.parseTicketKey("77")).toBe("77");
  });

  it("extracts the id from a _workitems/edit URL", () => {
    expect(ado.parseTicketKey("https://dev.azure.com/o/p/_workitems/edit/77")).toBe("77");
  });
});
