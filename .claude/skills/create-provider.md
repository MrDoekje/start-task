# Skill: Create or swap a provider

Providers are pluggable services used by start-task. Each has a simple interface — use a built-in factory or implement your own.

## Agent provider

Required in config as `agent`. Interface: `{ name: string, buildCommand: (promptFile: string) => string }`.

Built-in:

```js
import { createClaudeCodeAgent } from "../lib/providers/agents/claude-code.js";   // bin: "claude"
import { createCodexAgent } from "../lib/providers/agents/codex.js";               // bin: "codex"
import { createAiderAgent } from "../lib/providers/agents/aider.js";               // bin: "aider"
import { createGeminiAgent } from "../lib/providers/agents/gemini.js";             // bin: "gemini"
import { createOpenCodeAgent } from "../lib/providers/agents/opencode.js";         // bin: "opencode"

agent: createClaudeCodeAgent({ bin: "~/.local/bin/claude" }),
```

Custom:

```js
agent: {
  name: "my-agent",
  buildCommand: (promptFile) => `my-agent --prompt-file ${promptFile}`,
},
```

The `buildCommand` receives a path to a temp file containing the prompt text. It must return a shell command string that reads that file and starts the agent.

## Git provider

Optional custom key (typically `git`). Interface:

```js
git: {
  generateBranchName(ticketKey, summary) { return `feature/${ticketKey}-slug`; },
  async findBranch(projectConfig, ticketKey) { return "branch-name" || null; },
  async createBranch(projectConfig, branchName) { /* create remote branch */ },
  async createPR(projectConfig, branchName, ticket) { return "https://pr-url"; },
}
```

Built-in:

```js
import { createGitLabProvider } from "../lib/providers/gitlab.js";
git: createGitLabProvider({ apiUrl: process.env.GITLAB_API_URL, token: process.env.GITLAB_PRIVATE_TOKEN }),
```

`projectConfig` has `{ repoPath, defaultBranch }`. `ticket` has `{ key, summary, description, status, issueType, customFields? }`.

## Task provider

Optional custom key (typically `taskProvider`). Interface:

```js
taskProvider: {
  ticketKeyPattern: /^[A-Z]+-\d+$/,                    // regex to validate keys
  parseTicketKey(input) { return extractedKey; },       // parse from URL or raw input
  async fetchTicket(key) { return { key, summary, description, status, issueType, customFields? }; },
}
```

Built-in:

```js
import { createJiraProvider } from "../lib/providers/jira.js";
taskProvider: createJiraProvider({
  apiUrl: process.env.JIRA_API_URL,
  email: process.env.JIRA_USER_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  customFields: ["Acceptance Criteria", "Outline"],  // fetched as ticket.customFields["Acceptance Criteria"]
}),
```

## Terminal provider

Passed to `createTmuxSessionManager`. Interface: `{ name: string, openCommand: (bin: string, session: string) => string }`.

Built-in:

```js
import { createGhosttyTerminal } from "../lib/providers/terminals/ghostty.js"; // macOS Ghostty.app
import { createItermTerminal } from "../lib/providers/terminals/iterm.js"; // macOS iTerm2
import { createKittyTerminal } from "../lib/providers/terminals/kitty.js"; // cross-platform Kitty
```

Custom:

```js
terminal: {
  name: "alacritty",
  openCommand: (bin, session) => `alacritty -e ${bin} attach -t ${session}`,
},
```

## Session manager

Required in config as `sessionManager`. Built-in tmux implementation:

```js
import { createTmuxSessionManager } from "../lib/session/tmux.js";

sessionManager: createTmuxSessionManager({
  bin: "/opt/homebrew/bin/tmux",   // tmux binary path
  session: "tasks",                 // tmux session name
  terminal: createGhosttyTerminal(),
}),
```

Must implement: `launchTask`, `listWindows`, `closeWindow`, `switchToWindow`, `openWindow`, `isSessionRunning`, `ensureTuiWindow`, `openTerminalAttached`.

## Adding a new provider to lib/

Create a file in `lib/providers/` exporting a factory function. Follow the pattern of existing providers — take config options, validate required fields, return the interface object.
