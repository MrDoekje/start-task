import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { scanProjects, repoPathFromRemote } from "../lib/utils/scanProjects.js";

const TEST_DIR = resolve(tmpdir(), `start-task-scan-${process.pid}`);

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function makeGitRepo(name, remoteUrl) {
  const dir = resolve(TEST_DIR, name);
  mkdirSync(dir, { recursive: true });
  execSync("git init", { cwd: dir, stdio: "ignore" });
  execSync(`git remote add origin ${remoteUrl}`, { cwd: dir, stdio: "ignore" });
  return dir;
}

describe("repoPathFromRemote", () => {
  it("parses HTTPS URL", () => {
    expect(repoPathFromRemote("https://gitlab.com/org/project.git")).toBe("org/project");
  });

  it("parses HTTPS URL without .git", () => {
    expect(repoPathFromRemote("https://gitlab.com/org/sub/project")).toBe("org/sub/project");
  });

  it("parses SSH URL", () => {
    expect(repoPathFromRemote("git@gitlab.com:org/project.git")).toBe("org/project");
  });

  it("parses SSH URL without .git", () => {
    expect(repoPathFromRemote("git@gitlab.com:org/sub/project")).toBe("org/sub/project");
  });
});

describe("scanProjects", () => {
  it("returns empty object for non-existent directory", () => {
    expect(scanProjects("/nonexistent/path")).toEqual({});
  });

  it("discovers git repos in a directory", () => {
    makeGitRepo("my-app", "https://gitlab.com/org/my-app.git");
    makeGitRepo("api-server", "git@gitlab.com:org/api-server.git");

    const projects = scanProjects(TEST_DIR);

    expect(projects["my-app"]).toBeDefined();
    expect(projects["my-app"].repoPath).toBe("org/my-app");
    expect(projects["api-server"]).toBeDefined();
    expect(projects["api-server"].repoPath).toBe("org/api-server");
  });

  it("applies defaults to discovered projects", () => {
    makeGitRepo("app", "https://gitlab.com/org/app.git");

    const defaults = { setup: [{ action: "symlink", pattern: "node_modules", description: "nm" }] };
    const projects = scanProjects(TEST_DIR, defaults);

    expect(projects["app"].setup).toEqual(defaults.setup);
  });

  it("skips non-git directories", () => {
    mkdirSync(resolve(TEST_DIR, "not-a-repo"), { recursive: true });
    makeGitRepo("real-repo", "https://gitlab.com/org/real.git");

    const projects = scanProjects(TEST_DIR);
    expect(Object.keys(projects)).toEqual(["real-repo"]);
  });
});
