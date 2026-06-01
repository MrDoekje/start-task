/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: how a git provider turns (ticketKey, summary) into a branch name,
 * and the shared `toKebabCase` slug logic underneath it. Pure: provider
 * construction makes no network calls.
 */
import { describe, it, expect } from "vitest";
import { toKebabCase } from "../../lib/providers/git/utils.js";
import { createGitHubProvider } from "../../lib/providers/git/github.js";
import { createGitLabProvider } from "../../lib/providers/git/gitlab.js";
import { createAzureDevOpsProvider } from "../../lib/providers/git/azure-devops.js";
import { createBitbucketProvider } from "../../lib/providers/git/bitbucket.js";

describe("toKebabCase", () => {
  it("lowercases and hyphenates words", () => {
    expect(toKebabCase("Hello World")).toBe("hello-world");
  });

  it("drops characters outside [a-z0-9 -] and collapses separators", () => {
    expect(toKebabCase("Foo--Bar  Baz")).toBe("foo-bar-baz");
    expect(toKebabCase("Special@#Chars")).toBe("specialchars");
  });

  it("trims leading/trailing hyphens", () => {
    expect(toKebabCase("  Trim Me  ")).toBe("trim-me");
  });
});

describe("generateBranchName", () => {
  const gh = createGitHubProvider({ apiUrl: "https://api", token: "t" });

  it("combines the ticket key with a kebab-cased summary", () => {
    expect(gh.generateBranchName("PROJ-1", "Fix the Bug!")).toBe("PROJ-1-fix-the-bug");
  });

  it("caps the branch name at 200 characters", () => {
    const long = "word ".repeat(100);
    const name = gh.generateBranchName("PROJ-1", long);
    expect(name.length).toBe(200);
    expect(name.startsWith("PROJ-1-")).toBe(true);
  });

  it("is identical across git providers (shared logic)", () => {
    const gl = createGitLabProvider({ apiUrl: "https://api", token: "t" });
    const ado = createAzureDevOpsProvider({ orgUrl: "https://dev.azure.com/o", token: "t" });
    const bb = createBitbucketProvider({ token: "t" });
    const args = ["PROJ-9", "Add a Shiny New Feature"];
    const expected = "PROJ-9-add-a-shiny-new-feature";
    expect(gh.generateBranchName(...args)).toBe(expected);
    expect(gl.generateBranchName(...args)).toBe(expected);
    expect(ado.generateBranchName(...args)).toBe(expected);
    expect(bb.generateBranchName(...args)).toBe(expected);
  });
});
