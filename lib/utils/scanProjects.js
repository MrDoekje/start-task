import { readdirSync, statSync, existsSync } from "fs";
import { resolve, basename } from "path";
import { execSync } from "child_process";

/**
 * Extracts a repo path from a git remote URL.
 * Handles both HTTPS and SSH formats:
 *   https://gitlab.com/org/project.git → org/project
 *   git@gitlab.com:org/project.git → org/project
 * @param {string} remoteUrl
 * @returns {string}
 */
export function repoPathFromRemote(remoteUrl) {
  let path = remoteUrl.trim();

  // SSH format: git@host:org/project.git
  const sshMatch = path.match(/:([^/].*?)(?:\.git)?$/);
  if (sshMatch && !path.startsWith("http")) return sshMatch[1];

  // HTTPS format
  try {
    const url = new URL(path);
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return path;
  }
}

/**
 * Scans a directory for subdirectories containing `.git/`, reads the remote URL
 * for each, and builds a projects config map.
 *
 * @param {string} workspaceDir - Absolute path to the workspace directory
 * @param {Partial<import("../types.js").ProjectConfig>} [defaults] - Default config merged into each project
 * @returns {Record<string, import("../types.js").ProjectConfig>}
 */
export function scanProjects(workspaceDir, defaults = {}) {
  const projects = {};

  if (!existsSync(workspaceDir)) return projects;

  const entries = readdirSync(workspaceDir);

  for (const entry of entries) {
    const fullPath = resolve(workspaceDir, entry);
    const gitDir = resolve(fullPath, ".git");

    if (!statSync(fullPath).isDirectory()) continue;
    if (!existsSync(gitDir)) continue;

    let remoteUrl;
    try {
      remoteUrl = execSync("git remote get-url origin", {
        cwd: fullPath,
        encoding: "utf-8",
      }).trim();
    } catch {
      continue;
    }

    const repoPath = repoPathFromRemote(remoteUrl);

    let defaultBranch = "main";
    try {
      const head = execSync("git symbolic-ref refs/remotes/origin/HEAD", {
        cwd: fullPath,
        encoding: "utf-8",
      }).trim();
      defaultBranch = head.replace("refs/remotes/origin/", "");
    } catch {
      // Fallback to "main"
    }

    projects[basename(fullPath)] = {
      repoPath,
      defaultBranch,
      ...defaults,
    };
  }

  return projects;
}
