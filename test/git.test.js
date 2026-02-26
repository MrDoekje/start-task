import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readFileSync, readlinkSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { findByPattern, runSetupSteps } from "../lib/utils/git.js";

const TEST_DIR = resolve(tmpdir(), `start-task-test-${process.pid}`);
const PROJECT_DIR = resolve(TEST_DIR, "project");
const WORKTREE_DIR = resolve(TEST_DIR, "worktree");

function makeDir(path) {
  mkdirSync(path, { recursive: true });
}

function makeFile(path, content = "") {
  makeDir(resolve(path, ".."));
  writeFileSync(path, content);
}

beforeEach(() => {
  makeDir(PROJECT_DIR);
  makeDir(WORKTREE_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("findByPattern", () => {
  it("finds files matching a pattern", () => {
    makeFile(resolve(PROJECT_DIR, ".env"));
    makeFile(resolve(PROJECT_DIR, ".env.local"));
    makeFile(resolve(PROJECT_DIR, "src/index.js"));

    const results = findByPattern(PROJECT_DIR, ".env*", undefined, "f");
    expect(results).toContain(".env");
    expect(results).toContain(".env.local");
    expect(results).not.toContain("src/index.js");
  });

  it("excludes files matching excludePattern", () => {
    makeFile(resolve(PROJECT_DIR, ".env"));
    makeFile(resolve(PROJECT_DIR, ".env.example"));
    makeFile(resolve(PROJECT_DIR, ".env.local"));

    const results = findByPattern(PROJECT_DIR, ".env*", ".env*.example", "f");
    expect(results).toContain(".env");
    expect(results).toContain(".env.local");
    expect(results).not.toContain(".env.example");
  });

  it("finds directories matching a pattern", () => {
    makeDir(resolve(PROJECT_DIR, "node_modules/some-pkg"));
    makeDir(resolve(PROJECT_DIR, "unrelated"));

    const results = findByPattern(PROJECT_DIR, "node_modules", undefined, "d");
    expect(results.some((r) => r.includes("node_modules"))).toBe(true);
  });

  it("returns empty array when nothing matches", () => {
    const results = findByPattern(PROJECT_DIR, ".nonexistent*", undefined, "f");
    expect(results).toEqual([]);
  });

  it("skips node_modules when searching for files", () => {
    makeFile(resolve(PROJECT_DIR, ".env"));
    makeFile(resolve(PROJECT_DIR, "node_modules/.env"));

    const results = findByPattern(PROJECT_DIR, ".env*", undefined, "f");
    expect(results).toEqual([".env"]);
  });
});

describe("runSetupSteps", () => {
  it("copies files from project to worktree", () => {
    makeFile(resolve(PROJECT_DIR, ".env"), "SECRET=abc");

    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, [
      { action: "copy", pattern: ".env*", description: "env files" },
    ]);

    const dest = resolve(WORKTREE_DIR, ".env");
    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, "utf-8")).toBe("SECRET=abc");
  });

  it("creates symlinks for directories", () => {
    makeDir(resolve(PROJECT_DIR, "node_modules/some-pkg"));

    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, [
      { action: "symlink", pattern: "node_modules", description: "node_modules" },
    ]);

    const dest = resolve(WORKTREE_DIR, "node_modules");
    expect(existsSync(dest)).toBe(true);
    expect(readlinkSync(dest)).toBe(resolve(PROJECT_DIR, "node_modules"));
  });

  it("skips existing destinations", () => {
    makeFile(resolve(PROJECT_DIR, ".env"), "original");
    makeFile(resolve(WORKTREE_DIR, ".env"), "already-here");

    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, [
      { action: "copy", pattern: ".env*", description: "env files" },
    ]);

    // Should not overwrite
    expect(readFileSync(resolve(WORKTREE_DIR, ".env"), "utf-8")).toBe("already-here");
  });

  it("does nothing when steps is empty or undefined", () => {
    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, []);
    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, undefined);
    // No errors thrown
  });

  it("handles exclude pattern in copy steps", () => {
    makeFile(resolve(PROJECT_DIR, ".env"), "keep");
    makeFile(resolve(PROJECT_DIR, ".env.example"), "skip");

    runSetupSteps(PROJECT_DIR, WORKTREE_DIR, [
      {
        action: "copy",
        pattern: ".env*",
        excludePattern: ".env*.example",
        description: "env files",
      },
    ]);

    expect(existsSync(resolve(WORKTREE_DIR, ".env"))).toBe(true);
    expect(existsSync(resolve(WORKTREE_DIR, ".env.example"))).toBe(false);
  });
});
