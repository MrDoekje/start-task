#!/usr/bin/env node

import { resolve } from "path";

const __dirname = resolve(new URL(".", import.meta.url).pathname);
const isTui = process.argv.includes("--tui");

if (isTui) {
  // ── TUI mode: interactive menu (runs inside tmux window) ──
  const { default: runTui } = await import("./lib/tui.js");
  await runTui();
} else {
  // ── Launch mode: setup + tmux session + open terminal ──
  const { loadConfig } = await import("./lib/loadConfig.js");

  let config;
  let firstRun = false;

  try {
    config = await loadConfig();
  } catch {
    const { runSetupWizard } = await import("./lib/setupWizard.js");
    await runSetupWizard();
    config = await loadConfig();
    firstRun = true;
  }

  const { isSessionRunning, ensureTuiWindow, openTerminalAttached } = config.sessionManager;
  const cliScript = resolve(__dirname, "cli.js");
  const tuiCommand = `${firstRun ? "START_TASK_FIRST_RUN=1 " : ""}node ${cliScript} --tui`;

  if (isSessionRunning()) {
    ensureTuiWindow(tuiCommand);
    console.log("Switched to TUI window in existing session.");
  } else {
    ensureTuiWindow(tuiCommand);
    console.log("Created session with TUI window.");
  }

  openTerminalAttached();
}
