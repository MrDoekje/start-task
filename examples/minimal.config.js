/**
 * Minimal start-task configuration.
 *
 * Only uses the three required keys: agent, sessionManager, flows.
 * No git provider, task provider, worktrees, or projects needed.
 *
 * Copy this file to `user/start-task.config.js` and customize it.
 *
 * Swap the agent import for your preferred coding agent:
 *   createAiderAgent, createClaudeCodeAgent, createCodexAgent,
 *   createGeminiAgent, createOpenCodeAgent
 */
import { createCodexAgent } from "../lib/providers/agents/codex.js";
import { createTmuxSessionManager } from "../lib/session/tmux.js";
import { createGhosttyTerminal } from "../lib/providers/terminals/ghostty.js";
import { quickTaskAction } from "./quick-task.js";

/** @type {import("../lib/types.js").Config} */
export default {
  agent: createCodexAgent(),

  sessionManager: createTmuxSessionManager({
    bin: "/opt/homebrew/bin/tmux",
    session: "tasks",
    terminal: createGhosttyTerminal(),
  }),

  flows: {
    quick: {
      label: "Quick Task",
      steps: [
        { type: "text", key: "projectPath", message: "Project path (absolute or ~/relative):" },
        { type: "text", key: "instruction", message: "What should the agent do?" },
      ],
      action: quickTaskAction,
    },
  },
};
