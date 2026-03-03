import * as p from "@clack/prompts";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
  p.intro("start-task setup");

  // 1. Select agent
  const agentChoice = await p.select({
    message: "Which coding agent do you use?",
    options: AGENTS.map((a) => ({ value: a.value, label: a.label })),
  });
  if (p.isCancel(agentChoice)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const agent = AGENTS.find((a) => a.value === agentChoice);

  // 2. Agent binary path
  const agentBin = await p.text({
    message: "Path to agent binary:",
    placeholder: agent.defaultBin,
    initialValue: agent.defaultBin,
  });
  if (p.isCancel(agentBin)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // 3. Select terminal
  const terminalChoice = await p.select({
    message: "Which terminal emulator do you use?",
    options: TERMINALS.map((t) => ({ value: t.value, label: t.label })),
  });
  if (p.isCancel(terminalChoice)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const terminal = TERMINALS.find((t) => t.value === terminalChoice);

  // 4. Tmux binary path
  const tmuxBin = await p.text({
    message: "Path to tmux binary:",
    placeholder: DEFAULT_TMUX_BIN,
    initialValue: DEFAULT_TMUX_BIN,
  });
  if (p.isCancel(tmuxBin)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // 5. Session name
  const sessionName = await p.text({
    message: "Tmux session name:",
    placeholder: "tasks",
    initialValue: "tasks",
  });
  if (p.isCancel(sessionName)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // 6. Confirm overwrite if config already exists
  if (existsSync(CONFIG_PATH)) {
    const overwrite = await p.confirm({
      message: "Config file already exists. Overwrite it?",
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }
  }

  // 7. Write config
  const configContent = generateConfig({ agent, agentBin, terminal, tmuxBin, sessionName });
  const userDir = resolve(PROJECT_ROOT, "user");
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, configContent);

  p.log.success(`Config written to ${CONFIG_PATH}`);
  p.outro("Launching start-task...");
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
