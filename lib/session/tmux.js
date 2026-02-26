import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";

/**
 * @param {string} bin - Path to tmux binary
 * @param {string} args - tmux arguments
 * @returns {string}
 */
function runTmux(bin, args) {
  return execSync(`${bin} ${args}`, { encoding: "utf-8" }).trim();
}

const SHELLS = new Set(["zsh", "bash", "sh", "fish"]);

/**
 * Creates a complete tmux session manager.
 * @param {{ bin: string, session: string, terminal: import("../types.js").TerminalProvider }} opts
 * @returns {import("../types.js").SessionManager}
 */
export function createTmuxSessionManager(opts) {
  const { bin, session, terminal } = opts;
  const tmux = (args) => runTmux(bin, args);

  function sessionExists() {
    try {
      tmux(`has-session -t ${session}`);
      return true;
    } catch {
      return false;
    }
  }

  function isSessionRunning() {
    return sessionExists();
  }

  /**
   * Ensures a "tui" window exists in the session. Creates the session or window as needed.
   * @param {string} tuiCommand - Command to run in the TUI window
   */
  function ensureTuiWindow(tuiCommand) {
    const escaped = tuiCommand.replace(/'/g, "'\\''");
    if (!sessionExists()) {
      tmux(`new-session -d -s ${session} -n "tui" -c "${process.cwd()}"`);
      tmux(`send-keys -t ${session}:tui '${escaped}' Enter`);
    } else {
      try {
        tmux(`select-window -t ${session}:tui`);
      } catch {
        tmux(`new-window -t ${session} -n "tui" -c "${process.cwd()}"`);
        tmux(`send-keys -t ${session}:tui '${escaped}' Enter`);
      }
    }
  }

  function hasAttachedClient() {
    try {
      const clients = tmux(`list-clients -t ${session}`);
      return clients.length > 0;
    } catch {
      return false;
    }
  }

  function openTerminalAttached() {
    const cmd = terminal.openCommand(bin, session);
    execSync(cmd);
  }

  /**
   * Creates a tmux window with the agent in the left pane and shell pane(s) on the right.
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

    // Sanitize window name for tmux (no dots or colons)
    const safeName = windowName.replace(/[.:]/g, "-");

    let windowId;
    if (!sessionExists()) {
      windowId = tmux(
        `new-session -d -s ${session} -n "${safeName}" -c "${primaryDir}" -P -F "#{window_id}"`,
      );
    } else {
      windowId = tmux(
        `new-window -t ${session} -n "${safeName}" -c "${primaryDir}" -P -F "#{window_id}"`,
      );
    }

    // First shell pane (horizontal split to the right)
    tmux(`split-window -t ${windowId} -h -c "${dirs[0]}"`);

    // Additional shell panes stacked vertically on the right
    for (let i = 1; i < dirs.length; i++) {
      tmux(`split-window -t ${windowId}.1 -v -c "${dirs[i]}"`);
    }

    // Send agent command to the left pane (pane 0)
    const escaped = agentCmd.replace(/'/g, "'\\''");
    tmux(`send-keys -t ${windowId}.0 '${escaped}' Enter`);

    // Focus the left (agent) pane
    tmux(`select-pane -t ${windowId}.0`);

    // Switch to the new task window so the user sees it immediately
    tmux(`select-window -t ${session}:${safeName}`);

    console.log(`tmux session "${session}" — window "${safeName}" created.`);

    if (!hasAttachedClient()) {
      console.log("Opening terminal attached to tmux session...");
      openTerminalAttached();
    } else {
      console.log("Terminal already attached — new window added to existing session.");
    }
  }

  /**
   * @param {string} windowName
   * @returns {"running" | "exited"}
   */
  function getPaneStatus(windowName) {
    try {
      const cmd = tmux(
        `display-message -t ${session}:${windowName}.0 -p "#{pane_current_command}"`,
      );
      return SHELLS.has(cmd.toLowerCase()) ? "exited" : "running";
    } catch {
      return "exited";
    }
  }

  /**
   * Lists all task windows (non-TUI) in the tmux session.
   * @returns {{ name: string, active: boolean, paneCount: number, status: "running" | "exited" }[]}
   */
  function listWindows() {
    if (!sessionExists()) return [];
    try {
      const raw = tmux(
        `list-windows -t ${session} -F "#{window_name}\t#{window_active}\t#{window_panes}"`,
      );
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, active, paneCount] = line.split("\t");
          return {
            name,
            active: active === "1",
            paneCount: parseInt(paneCount),
            status: getPaneStatus(name),
          };
        })
        .filter((w) => w.name !== "tui");
    } catch {
      return [];
    }
  }

  /**
   * Closes (kills) a tmux window by name.
   * @param {string} windowName
   */
  function closeWindow(windowName) {
    tmux(`kill-window -t ${session}:${windowName}`);
  }

  /**
   * Switches to a specific window in the tmux session.
   * @param {string} windowName
   */
  function switchToWindow(windowName) {
    tmux(`select-window -t ${session}:${windowName}`);
  }

  /**
   * Opens a new tmux window running a command.
   * @param {string} cwd - Working directory for the window
   * @param {string} command - Command to run in the window
   * @param {string} windowName - Name for the tmux window
   */
  function openWindow(cwd, command, windowName) {
    const safeName = windowName.replace(/[.:]/g, "-");

    if (!sessionExists()) {
      tmux(`new-session -d -s ${session} -n "${safeName}" -c "${cwd}"`);
    } else {
      tmux(`new-window -t ${session} -n "${safeName}" -c "${cwd}"`);
    }

    const escaped = command.replace(/'/g, "'\\''");
    tmux(`send-keys -t ${session}:${safeName} '${escaped}' Enter`);
  }

  return {
    launchTask,
    listWindows,
    closeWindow,
    switchToWindow,
    openWindow,
    isSessionRunning,
    ensureTuiWindow,
    openTerminalAttached,
  };
}
