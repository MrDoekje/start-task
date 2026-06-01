import React from "react";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderScreen } from "./tui-ink/renderScreen.js";
import SetupWizard from "./tui-ink/SetupWizard.jsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const CONFIG_PATH = resolve(PROJECT_ROOT, "user", "start-task.config.js");

const AGENTS = [
  {
    value: "aider",
    label: "Aider",
    defaultBin: "aider",
    factory: "createAiderAgent",
    import: "../lib/providers/agents/aider.js",
  },
  {
    value: "claude-code",
    label: "Claude Code",
    defaultBin: "claude",
    factory: "createClaudeCodeAgent",
    import: "../lib/providers/agents/claude-code.js",
  },
  {
    value: "codex",
    label: "Codex",
    defaultBin: "codex",
    factory: "createCodexAgent",
    import: "../lib/providers/agents/codex.js",
  },
  {
    value: "gemini",
    label: "Gemini CLI",
    defaultBin: "gemini",
    factory: "createGeminiAgent",
    import: "../lib/providers/agents/gemini.js",
  },
  {
    value: "opencode",
    label: "OpenCode",
    defaultBin: "opencode",
    factory: "createOpenCodeAgent",
    import: "../lib/providers/agents/opencode.js",
  },
];

const TERMINALS = [
  {
    value: "ghostty",
    label: "Ghostty",
    factory: "createGhosttyTerminal",
    import: "../lib/providers/terminals/ghostty.js",
  },
  {
    value: "iterm",
    label: "iTerm",
    factory: "createItermTerminal",
    import: "../lib/providers/terminals/iterm.js",
  },
  {
    value: "kitty",
    label: "Kitty",
    factory: "createKittyTerminal",
    import: "../lib/providers/terminals/kitty.js",
  },
];

const DEFAULT_TMUX_BIN =
  process.arch === "arm64" ? "/opt/homebrew/bin/tmux" : "/usr/local/bin/tmux";

/**
 * Runs an interactive setup wizard to generate a minimal start-task config.
 * @returns {Promise<void>}
 */
export async function runSetupWizard() {
  const answers = await renderScreen((onResult) =>
    React.createElement(SetupWizard, {
      agents: AGENTS,
      terminals: TERMINALS,
      defaultTmuxBin: DEFAULT_TMUX_BIN,
      configExists: existsSync(CONFIG_PATH),
      onComplete: onResult,
      onCancel: () => onResult(null),
    }),
  );

  if (!answers) {
    console.log("Setup cancelled.");
    process.exit(0);
  }

  const agent = AGENTS.find((a) => a.value === answers.agent);
  const terminal = TERMINALS.find((t) => t.value === answers.terminal);

  const configContent = generateConfig({
    agent,
    agentBin: answers.agentBin,
    terminal,
    tmuxBin: answers.tmuxBin,
    sessionName: answers.sessionName,
  });
  const userDir = resolve(PROJECT_ROOT, "user");
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, configContent);

  console.log(`\n✓ Config written to ${CONFIG_PATH}`);
  console.log("Launching start-task...\n");
}

function generateConfig({ agent, agentBin, terminal, tmuxBin, sessionName }) {
  return `import { ${agent.factory} } from "${agent.import}";
import { createTmuxSessionManager } from "../lib/session/tmux.js";
import { ${terminal.factory} } from "${terminal.import}";
import { setupFlow } from "../lib/presets/flows/setup.js";

/** @type {import("../lib/types.js").Config} */
export default {
  agent: ${agent.factory}({ bin: "${agentBin}" }),

  sessionManager: createTmuxSessionManager({
    bin: "${tmuxBin}",
    session: "${sessionName}",
    terminal: ${terminal.factory}(),
  }),

  flows: {
    setup: setupFlow,
  },
};
`;
}
