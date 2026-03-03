import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("../lib/providers/git/utils.js", () => ({
  toKebabCase: (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  createAzureDevOpsClient: vi.fn(() => mockClient),
}));

import { createAzureDevOpsProvider } from "../lib/providers/git/azure-devops.js";

describe("createAzureDevOpsProvider", () => {
  it("throws if orgUrl is missing", () => {
    expect(() => createAzureDevOpsProvider({ token: "t" })).toThrow("orgUrl");
  });

  it("throws if token is missing", () => {
    expect(() => createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/org" })).toThrow("token");
  });

  it("returns provider with expected methods", () => {
    const provider = createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/org", token: "t" });
    expect(typeof provider.generateBranchName).toBe("function");
    expect(typeof provider.findBranch).toBe("function");
    expect(typeof provider.createBranch).toBe("function");
    expect(typeof provider.createPR).toBe("function");
  });

  it("generates branch name from ticket key and summary", () => {
    const provider = createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/org", token: "t" });
    expect(provider.generateBranchName("PROJ-123", "Fix login bug")).toBe("PROJ-123-fix-login-bug");
  });

  it("findBranch returns matching branch name with refs/heads/ stripped", async () => {
    const provider = createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/org", token: "t" });
    mockGet.mockResolvedValueOnce({
      data: { value: [{ name: "refs/heads/PROJ-123-fix" }] },
    });

    const result = await provider.findBranch({ repoPath: "project/repo" }, "PROJ-123");
    expect(result).toBe("PROJ-123-fix");
  });

  it("findBranch returns null when no matching branch", async () => {
    const provider = createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/org", token: "t" });
    mockGet.mockResolvedValueOnce({
      data: { value: [] },
    });

    const result = await provider.findBranch({ repoPath: "project/repo" }, "PROJ-123");
    expect(result).toBe(null);
  });
});
