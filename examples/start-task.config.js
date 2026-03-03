/**
 * Example start-task configuration.
 *
 * Copy this file to `user/start-task.config.js` and customize it.
 * See the project documentation for the full config reference.
 */
import { createGitLabProvider } from "../lib/providers/git/gitlab.js";
import { createJiraProvider } from "../lib/providers/tickets/jira.js";
import { createClaudeCodeAgent } from "../lib/providers/agents/claude-code.js";
import { createGeminiAgent } from "../lib/providers/agents/gemini.js";
import { createTmuxSessionManager } from "../lib/session/tmux.js";
import { createGhosttyTerminal } from "../lib/providers/terminals/ghostty.js";
import { nodeSetup } from "../lib/presets/setup/node.js";
import { ticketKeyStep } from "../lib/presets/steps/ticket.js";
import { projectKeysStep, userContextStep } from "../lib/presets/steps/common.js";
import { setupFlow } from "../lib/presets/flows/setup.js";
import { startAction } from "./start.js";
import { investigateAction } from "./investigate.js";

/** @type {import("../lib/types.js").Config} */
export default {
  // ── Workspace ──
  workspaceRoot: "~/workspace",

  // ── Providers ──
  git: createGitLabProvider({
    apiUrl: process.env.GITLAB_API_URL,
    token: process.env.GITLAB_PRIVATE_TOKEN,
  }),

  taskProvider: createJiraProvider({
    apiUrl: process.env.JIRA_API_URL,
    email: process.env.JIRA_USER_EMAIL,
    token: process.env.JIRA_API_TOKEN,
    customFields: ["Acceptance Criteria", "Outline"],
  }),

  // ── Agent + Session ──
  agent: createClaudeCodeAgent(),

  sessionManager: createTmuxSessionManager({
    bin: "/opt/homebrew/bin/tmux",
    session: "tasks",
    terminal: createGhosttyTerminal(),
  }),

  // ── Worktree ──
  worktree: {
    enabled: true,
    path: (projectDir, branchName) => `${projectDir}/worktrees/${branchName}`,
  },

  // ── Projects ──
  projects: {
    "my-app": {
      repoPath: "org/my-app",
      defaultBranch: "main",
      setup: nodeSetup,
    },
  },

  // ── Reusable steps ──
  steps: {
    ticketKey: ticketKeyStep,
    projectKeys: projectKeysStep,
    userContext: userContextStep,
  },

  // ── Option steps (runtime overrides shown after flow wizard) ──
  optionSteps: {
    agent: {
      type: "select",
      label: "Agent",
      message: "Which agent?",
      options: [
        { value: createClaudeCodeAgent(), label: "Claude Code" },
        { value: createGeminiAgent(), label: "Gemini CLI" },
      ],
    },
  },

  // ── Flows ──
  flows: {
    start: {
      label: "Start Task",
      steps: ["ticketKey", "projectKeys", "userContext"],
      action: startAction,
      // overrides: true — default, optionSteps shown after wizard
    },
    investigate: {
      label: "Investigate",
      steps: ["ticketKey", "projectKeys"],
      action: investigateAction,
      options: { agent: createGeminiAgent() }, // static: always use Gemini
      overrides: false,                        // no runtime overrides
    },
    setup: setupFlow,
  },
};
