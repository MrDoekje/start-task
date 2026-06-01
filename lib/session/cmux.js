import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";

/**
 * @param {string} bin - Path to cmux binary
 * @param {string} globalFlags - Global flags prepended to every command
 * @param {string} args - cmux CLI arguments
 * @returns {string}
 */
function runCmux(bin, globalFlags, args) {
  const cmd = globalFlags
    ? `${bin} ${globalFlags} ${args}`
    : `${bin} ${args}`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

/**
 * Parses the ID from cmux command responses (e.g. "OK workspace:1" → "workspace:1").
 * @param {string} response
 * @returns {string}
 */
function parseId(response) {
  if (response.startsWith("OK ")) return response.slice(3).trim();
  return response.trim();
}

/**
 * Escapes a string for use inside single-quoted shell arguments.
 * @param {string} str
 * @returns {string}
 */
function shellEscape(str) {
  return str.replace(/'/g, "'\\''");
}

/**
 * Parses the text output of `cmux list-workspaces` into structured objects.
 *
 * Format: `[*] workspace:N  title  [selected]`
 * @param {string} output
 * @returns {Array<{ id: string, title: string, selected: boolean }>}
 */
function parseWorkspaceList(output) {
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const selected = line.startsWith("*");
      // Strip leading `* ` or `  `, then split on first two-space gap
      const trimmed = line.replace(/^[* ] /, "").trim();
      const match = trimmed.match(/^(workspace:\d+)\s{2,}(.+?)(?:\s+\[selected\])?$/);
      if (!match) return null;
      return { id: match[1], title: match[2].trim(), selected };
    })
    .filter(Boolean);
}

/**
 * Creates a cmux session manager.
 *
 * cmux is a native macOS terminal with built-in workspace/pane management,
 * so it replaces both the terminal provider and tmux session manager.
 *
 * @param {{ bin?: string, password?: string }} [opts]
 * @returns {import("../types.js").SessionManager}
 */
export function createCmuxSessionManager(opts = {}) {
  const bin =
    opts.bin || "/Applications/cmux.app/Contents/Resources/bin/cmux";
  const password = opts.password || process.env.CMUX_SOCKET_PASSWORD;
  const globalFlags = password
    ? `--password '${shellEscape(password)}'`
    : "";
  const cmux = (args) => runCmux(bin, globalFlags, args);

  function isSessionRunning() {
    try {
      cmux("ping");
      return true;
    } catch {
      return false;
    }
  }

  function hasAttachedClient() {
    // cmux is a GUI app — if it responds to ping, it's running and "attached"
    return isSessionRunning();
  }

  function openTerminalAttached() {
    execSync("open -a cmux");
  }

  /**
   * Ensures cmux has at least one window. Returns true if a new window was
   * created (meaning it has a default workspace that can be reused).
   * @returns {boolean}
   */
  function ensureWindow() {
    try {
      const out = cmux("list-windows");
      if (out === "No windows") {
        cmux("new-window");
        return true;
      }
      return false;
    } catch {
      cmux("new-window");
      return true;
    }
  }

  /**
   * @returns {Array<{ id: string, title: string, selected: boolean }>}
   */
  function listWorkspacesRaw() {
    try {
      return parseWorkspaceList(cmux("list-workspaces"));
    } catch {
      return [];
    }
  }

  /**
   * @param {string} name
   * @returns {{ id: string, title: string, selected: boolean } | undefined}
   */
  function findWorkspace(name) {
    return listWorkspacesRaw().find((w) => w.title === name);
  }

  /**
   * Creates a workspace with a command, reusing the default workspace if a
   * fresh window was just created (to avoid an empty orphan workspace).
   * @param {string} cwd
   * @param {string} command - Will be typed into the shell after init
   * @returns {string} workspace ref id
   */
  function createWorkspace(cwd, command) {
    const freshWindow = ensureWindow();

    if (freshWindow) {
      // new-window created a default workspace — reuse it instead of creating another
      const workspaces = listWorkspacesRaw();
      const defaultWs = workspaces[0];
      if (defaultWs) {
        cmux(
          `send --workspace ${defaultWs.id} 'cd ${shellEscape(cwd)} && ${shellEscape(command)}'`,
        );
        cmux(`send-key --workspace ${defaultWs.id} enter`);
        return defaultWs.id;
      }
    }

    // Window already existed — create a new workspace
    const wsId = parseId(
      cmux(
        `new-workspace --cwd '${shellEscape(cwd)}' --command '${shellEscape(command + "\n")}'`,
      ),
    );
    return wsId;
  }

  /**
   * Sends text to the focused surface of a workspace and presses Enter.
   * @param {string} wsId - Workspace ID
   * @param {string} text - Text to send
   */
  function sendToFocused(wsId, text) {
    cmux(`send --workspace ${wsId} '${shellEscape(text)}'`);
    cmux(`send-key --workspace ${wsId} enter`);
  }

  /**
   * Returns the first pane id of a workspace, or null if none can be parsed.
   * Format from `list-panes`: `[*] pane:N  [M surface(s)]  [focused?]`.
   * @param {string} wsId
   * @returns {string | null}
   */
  function firstPaneId(wsId) {
    try {
      const out = cmux(`list-panes --workspace ${wsId}`);
      const lines = out.split("\n").filter(Boolean);
      for (const line of lines) {
        const match = line.replace(/^\*?\s*/, "").match(/^(pane:\d+)/);
        if (match) return match[1];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * @param {string} tuiCommand - Command to run in the TUI workspace
   */
  function ensureTuiWindow(tuiCommand) {
    const existing = findWorkspace("tui");
    if (existing) {
      cmux(`select-workspace --workspace ${existing.id}`);
      return;
    }

    const wsId = createWorkspace(process.cwd(), tuiCommand);
    cmux(`rename-workspace --workspace ${wsId} 'tui'`);
    cmux(`select-workspace --workspace ${wsId}`);
  }

  /**
   * Creates a cmux workspace with the agent in the left pane and shell pane(s) on the right.
   * @param {string | string[]} workingDirs
   * @param {string} prompt
   * @param {string} windowName
   * @param {(promptFile: string) => string} buildCommand - Agent command builder
   */
  function launchTask(workingDirs, prompt, windowName, buildCommand) {
    const dirs = Array.isArray(workingDirs) ? workingDirs : [workingDirs];
    const primaryDir = dirs[0];

    const promptPath = resolve(primaryDir, ".agent-prompt.txt");
    writeFileSync(promptPath, prompt);

    const agentCmd = buildCommand(promptPath);
    const safeName = windowName.replace(/[.:]/g, "-");

    const wsId = createWorkspace(primaryDir, agentCmd);
    cmux(`rename-workspace --workspace ${wsId} '${shellEscape(safeName)}'`);

    // Capture the agent pane id before any splits so we can refocus it at the end.
    const agentPane = firstPaneId(wsId);

    // Split right for first shell pane — new pane gets focus
    cmux(`new-split right --workspace ${wsId}`);
    sendToFocused(wsId, `cd '${shellEscape(dirs[0])}'`);

    // Additional shell panes stacked vertically on the right
    for (let i = 1; i < dirs.length; i++) {
      try {
        cmux(`new-split down --workspace ${wsId}`);
        sendToFocused(wsId, `cd '${shellEscape(dirs[i])}'`);
      } catch {
        break;
      }
    }

    // Splits leave focus on the last new pane; return focus to the agent so the
    // user lands on Claude instead of the shell.
    if (agentPane) {
      try { cmux(`focus-pane --pane ${agentPane} --workspace ${wsId}`); } catch { /* best effort */ }
    }

    cmux(`select-workspace --workspace ${wsId}`);

    console.log(`cmux workspace "${safeName}" created.`);

    if (!hasAttachedClient()) {
      console.log("Opening cmux...");
      openTerminalAttached();
    } else {
      console.log("Workspace added to cmux.");
    }
  }

  /**
   * Lists all task workspaces (non-TUI).
   * @returns {{ name: string, active: boolean, paneCount: number, status: "running" | "exited" }[]}
   */
  function listWindows() {
    if (!isSessionRunning()) return [];
    try {
      return listWorkspacesRaw()
        .filter((w) => w.title !== "tui")
        .map((w) => ({
          name: w.title,
          active: w.selected,
          paneCount: 1,
          status: /** @type {"running"} */ ("running"),
        }));
    } catch {
      return [];
    }
  }

  /**
   * @param {string} windowName
   */
  function closeWindow(windowName) {
    const ws = findWorkspace(windowName);
    if (ws) cmux(`close-workspace --workspace ${ws.id}`);
  }

  /**
   * @param {string} windowName
   */
  function switchToWindow(windowName) {
    const ws = findWorkspace(windowName);
    if (ws) cmux(`select-workspace --workspace ${ws.id}`);
  }

  /**
   * @param {string} cwd - Working directory
   * @param {string} command - Command to run
   * @param {string} windowName - Workspace name
   */
  function openWindow(cwd, command, windowName) {
    const safeName = windowName.replace(/[.:]/g, "-");

    const wsId = createWorkspace(cwd, command);
    cmux(`rename-workspace --workspace ${wsId} '${shellEscape(safeName)}'`);
  }

  return {
    launchTask,
    listWindows,
    closeWindow,
    switchToWindow,
    openWindow,
    isSessionRunning,
    hasAttachedClient,
    ensureTuiWindow,
    openTerminalAttached,
  };
}
