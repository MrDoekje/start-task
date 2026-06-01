#!/usr/bin/env node

import { resolve } from "path";
import { register as registerTsx } from "tsx/esm/api";

// Register tsx loader so .jsx files (used by the Ink TUI) load without a build step.
registerTsx();

const __dirname = resolve(new URL(".", import.meta.url).pathname);
const isTui = process.argv.includes("--tui");

if (isTui) {
  // ── TUI mode: interactive menu (runs inside tmux window) ──
  const { default: runTui } = await import("./lib/tui-ink/index.jsx");
  await runTui();
} else {
  // ── Launch mode: setup + tmux session + open terminal ──
  const { loadConfig } = await import("./lib/loadConfig.js");

  let config;
  let firstRun = false;

  try {
    config = await loadConfig();
  } catch {
    const { runSetupWizard } = await import("./lib/setupWizard.jsx");
    await runSetupWizard();
    config = await loadConfig();
    firstRun = true;
  }

  const { isSessionRunning, hasAttachedClient, ensureTuiWindow, openTerminalAttached } = config.sessionManager;
  const cliScript = resolve(__dirname, "cli.js");
  const nodeCmd = `${firstRun ? "START_TASK_FIRST_RUN=1 " : ""}node ${cliScript} --tui`;
  const tuiCommand = `while true; do ${nodeCmd}; [ $? -ne 99 ] && break; done`;

  if (isSessionRunning()) {
    ensureTuiWindow(tuiCommand);
    console.log("Switched to TUI window in existing session.");
  } else {
    ensureTuiWindow(tuiCommand);
    console.log("Created session with TUI window.");
  }

  if (!hasAttachedClient()) {
    openTerminalAttached();
  }
}
