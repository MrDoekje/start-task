import { resolve } from "path";
import { homedir } from "os";
import { gitFetch, ensureWorktree as ensureWorktreeRaw, runSetupSteps } from "./utils/git.js";
import { validateProjectKeys, formatError } from "./validation.js";

/**
 * Expands a leading `~` in a path to the user's home directory.
 * @param {string} p - Path that may start with `~`
 * @returns {string} Absolute path with `~` expanded
 */
export function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return resolve(homedir(), p.slice(2));
  return p;
}

/**
 * Builds the action utilities object that is passed to flow action functions.
 * @param {import("./types.js").Config} config
 * @returns {import("./types.js").ActionUtils}
 */
export function buildActionUtils(config) {
  const { listWindows, closeWindow, switchToWindow, openWindow } = config.sessionManager;

  /**
   * Wraps sessionManager.launchTask to inject config.agent.buildCommand.
   * Accepts an optional 4th parameter to override the agent at launch time.
   * @param {string | string[]} workingDirs
   * @param {string} prompt
   * @param {string} windowName
   * @param {{ agent?: import("./types.js").AgentProvider }} [options]
   */
  function launchTask(workingDirs, prompt, windowName, options = {}) {
    const buildCommand = options.agent?.buildCommand ?? config.agent.buildCommand;
    config.sessionManager.launchTask(workingDirs, prompt, windowName, buildCommand);
  }

  /**
   * Wraps ensureWorktree to use the config.worktree.path function if provided,
   * otherwise falls back to `${projectDir}/worktrees/${branchName}`.
   * @param {string} projectDir
   * @param {string} branchName
   * @returns {string}
   */
  function ensureWorktree(projectDir, branchName) {
    const worktreeDir =
      config.worktree?.path?.(projectDir, branchName) ??
      resolve(projectDir, "worktrees", branchName);
    return ensureWorktreeRaw(projectDir, branchName, worktreeDir);
  }

  return {
    // Git
    gitFetch,
    ensureWorktree,
    runSetupSteps,

    // Session management
    launchTask,
    listWindows,
    closeWindow,
    switchToWindow,
    openWindow,

    // Validation
    validateProjectKeys,
    formatError,

    // Helpers
    resolve,
    expandHome,
  };
}
