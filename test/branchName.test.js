import { describe, it, expect } from "vitest";
import { validateBranchName, cleanBranchName } from "../lib/utils/branchName.js";

describe("validateBranchName", () => {
  it("accepts ordinary branch names", () => {
    expect(validateBranchName("feature/add-login")).toBeUndefined();
    expect(validateBranchName("OC-1234-fix-thing")).toBeUndefined();
    expect(validateBranchName("release/v1.2.3")).toBeUndefined();
    expect(validateBranchName("  hotfix/urgent  ")).toBeUndefined();
  });

  it("requires a non-empty name", () => {
    expect(validateBranchName("")).toMatch(/required/);
    expect(validateBranchName("   ")).toMatch(/required/);
    expect(validateBranchName(undefined)).toMatch(/required/);
  });

  it("rejects names that start with a dash", () => {
    expect(validateBranchName("-foo")).toMatch(/dash/);
  });

  it("rejects leading/trailing slashes and a trailing dot", () => {
    expect(validateBranchName("/foo")).toMatch(/slash/);
    expect(validateBranchName("foo/")).toMatch(/slash/);
    expect(validateBranchName("foo.")).toMatch(/dot/);
  });

  it("rejects '..', '//', '@{' and a lone '@'", () => {
    expect(validateBranchName("foo..bar")).toMatch(/\.\./);
    expect(validateBranchName("foo//bar")).toMatch(/consecutive slashes/);
    expect(validateBranchName("foo@{bar")).toMatch(/@\{/);
    expect(validateBranchName("@")).toMatch(/'@'/);
  });

  it("rejects forbidden characters and whitespace", () => {
    for (const bad of ["a b", "a~b", "a^b", "a:b", "a?b", "a*b", "a[b", "a\\b"]) {
      expect(validateBranchName(bad), bad).toMatch(/cannot contain/);
    }
  });

  it("rejects control characters", () => {
    expect(validateBranchName("foo\tbar")).toMatch(/control/);
  });

  it("rejects segments that start with a dot or end with .lock", () => {
    expect(validateBranchName("foo/.bar")).toMatch(/segments cannot start/);
    expect(validateBranchName(".bar")).toMatch(/segments cannot start/);
    expect(validateBranchName("foo/bar.lock")).toMatch(/\.lock/);
  });
});

describe("cleanBranchName", () => {
  it("lowercases, hyphenates whitespace, and drops invalid characters", () => {
    expect(cleanBranchName("Add Login Feature!")).toBe("add-login-feature");
    expect(cleanBranchName("Fix: thing (urgent)")).toBe("fix-thing-urgent");
  });

  it("preserves slash hierarchy and tidies segments", () => {
    expect(cleanBranchName("Feature/My Thing")).toBe("feature/my-thing");
    expect(cleanBranchName("foo//bar")).toBe("foo/bar");
  });

  it("collapses repeats and trims stray separators", () => {
    expect(cleanBranchName("  --foo..bar--  ")).toBe("foo.bar");
    expect(cleanBranchName("foo---bar")).toBe("foo-bar");
  });

  it("strips a trailing .lock per segment", () => {
    expect(cleanBranchName("foo.lock")).toBe("foo");
    expect(cleanBranchName("foo/bar.lock")).toBe("foo/bar");
  });

  it("returns empty when nothing usable remains", () => {
    expect(cleanBranchName("~^:*")).toBe("");
    expect(cleanBranchName("")).toBe("");
  });

  it("always produces something validateBranchName accepts", () => {
    for (const input of [
      "Add Login Feature!",
      "Feature/My Thing",
      "  --foo..bar--  ",
      "OC-1234: Fix the Bug",
      "release/v1.2.3",
    ]) {
      const cleaned = cleanBranchName(input);
      expect(cleaned, input).not.toBe("");
      expect(validateBranchName(cleaned), `${input} -> ${cleaned}`).toBeUndefined();
    }
  });
});
