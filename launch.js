#!/usr/bin/env node

import { resolve } from "path";
import { loadConfig } from "./lib/loadConfig.js";

const __dirname = resolve(new URL(".", import.meta.url).pathname);
const tuiScript = resolve(__dirname, "tui.js");

async function main() {
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

  const tuiCommand = `${firstRun ? "START_TASK_FIRST_RUN=1 " : ""}node ${tuiScript}`;

  if (isSessionRunning()) {
    ensureTuiWindow(tuiCommand);
    console.log("Switched to TUI window in existing session.");
  } else {
    ensureTuiWindow(tuiCommand);
    console.log("Created session with TUI window.");
  }

  openTerminalAttached();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
