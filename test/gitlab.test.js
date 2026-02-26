import { describe, it, expect } from "vitest";
import { toKebabCase, createGitLabProvider } from "../lib/providers/gitlab.js";

describe("toKebabCase", () => {
  it("converts to lowercase kebab-case", () => {
    expect(toKebabCase("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(toKebabCase("Fix bug: crash on login!")).toBe("fix-bug-crash-on-login");
  });

  it("collapses multiple dashes", () => {
    expect(toKebabCase("one---two")).toBe("one-two");
  });

  it("trims leading and trailing dashes", () => {
    expect(toKebabCase("-leading and trailing-")).toBe("leading-and-trailing");
  });

  it("collapses multiple spaces", () => {
    expect(toKebabCase("too   many   spaces")).toBe("too-many-spaces");
  });
});

describe("createGitLabProvider", () => {
  it("throws if apiUrl is missing", () => {
    expect(() => createGitLabProvider({ token: "t" })).toThrow("apiUrl");
  });

  it("throws if token is missing", () => {
    expect(() => createGitLabProvider({ apiUrl: "https://gitlab.com/api/v4" })).toThrow("token");
  });

  it("returns provider with expected methods", () => {
    const provider = createGitLabProvider({ apiUrl: "https://gitlab.com/api/v4", token: "t" });
    expect(typeof provider.generateBranchName).toBe("function");
    expect(typeof provider.findBranch).toBe("function");
    expect(typeof provider.createBranch).toBe("function");
    expect(typeof provider.createPR).toBe("function");
  });

  it("generates branch name from ticket key and summary", () => {
    const provider = createGitLabProvider({ apiUrl: "https://gitlab.com/api/v4", token: "t" });
    expect(provider.generateBranchName("PROJ-123", "Fix login bug")).toBe("PROJ-123-fix-login-bug");
  });

  it("truncates branch name to 200 characters", () => {
    const provider = createGitLabProvider({ apiUrl: "https://gitlab.com/api/v4", token: "t" });
    const longSummary = "a".repeat(250);
    const result = provider.generateBranchName("PROJ-1", longSummary);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.startsWith("PROJ-1-")).toBe(true);
  });

  it("handles special characters in branch name summary", () => {
    const provider = createGitLabProvider({ apiUrl: "https://gitlab.com/api/v4", token: "t" });
    expect(provider.generateBranchName("PROJ-42", "[Panel] Fix crash: login & signup")).toBe(
      "PROJ-42-panel-fix-crash-login-signup",
    );
  });
});
