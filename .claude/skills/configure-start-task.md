# Skill: Configure start-task

Modify the user's start-task configuration at `user/start-task.config.js`.

## Config structure

The config exports a default object. The framework requires three keys (`agent`, `sessionManager`, `flows`). Everything else is custom keys your flow actions use.

```js
export default {
  // ── Required ──
  agent: createClaudeCodeAgent({ bin: "claude" }),
  sessionManager: createTmuxSessionManager({ bin: "/opt/homebrew/bin/tmux", session: "tasks", terminal: createGhosttyTerminal() }),
  flows: { ... },

  // ── Optional: reusable wizard steps ──
  steps: { ... },

  // ── Custom keys (framework ignores, flow actions use) ──
  workspaceRoot: "~/workspace",
  git: createGitLabProvider({ ... }),
  taskProvider: createJiraProvider({ ... }),
  worktree: { enabled: true, path: (dir, branch) => `${dir}/worktrees/${branch}` },
  projects: { ... },
};
```

## First-run setup

When doing a first-run setup (launched automatically after the setup wizard), ask the user about their workflow preferences before configuring anything. The setup wizard has already configured `agent`, `sessionManager`, and `flows` (with a basic Quick Task flow).

### Questions to ask (one at a time)

1. **Worktrees & branches** — Does each task get its own git branch and worktree, or do they work directly in the project directory?
2. **Task context source** — How do they want to provide task context?
   - **Ticket provider** — uses a tracker (Jira, GitLab Issues, Linear, Notion); create or reuse a built-in provider that fetches tickets by key/URL
   - **MCP or tool** — they already have (or plan to add) an MCP server that can fetch tickets; the flow action should call that MCP tool instead of a built-in provider. Ask which MCP tool name to use, then verify it exists in the agent's MCP config (e.g. `.claude/settings.json` or the project's MCP setup). If it doesn't exist yet, let them know they'll need to configure it and offer to help
   - **Manual** — they paste task context directly, no fetching needed
3. **Flows** — Which flows to add to the menu? (Start Task, Investigate, QA, Quick Task, Custom)

### Wiring wizard steps

The wizard steps depend on the combination of task source and worktree preference. Use these as a starting point — adapt based on the user's actual needs:

**With worktrees:**

- Ticket provider or MCP: `ticketKey → projectKeys → userContext`
- Manual context: `branchName → projectKeys → taskContext`

**Without worktrees:**

- Ticket provider or MCP: `ticketKey → projectPath → userContext`
- Manual context: `projectPath → instruction`

When using an **MCP or tool** for tickets, the flow action fetches the ticket inside the action function (by calling the MCP or using the tool via the agent prompt) rather than through a `taskProvider` on the config. The wizard steps stay the same — only the action implementation differs.

### Setup checklist

1. **Check existing providers** in `lib/providers/` — reuse if they match the user's needs
2. **Create new providers** via `/create-provider` if nothing matches
3. **If using MCP for tickets** — verify the MCP tool exists in the agent's config (check `.claude/settings.json` or project MCP setup). If it doesn't exist yet, inform the user and offer to help set it up. The flow action should include the MCP tool call in the agent prompt (e.g. "Use the `fetch_ticket` tool to get ticket {key}") rather than using a `taskProvider`
4. **Create `user/shared.js`** with a `ticketSections` helper if using a ticket provider — this formats ticket data into prompt sections reusable across flow actions
5. **Add projects** to config — ask for workspace root, discover or manually list projects
6. **Create flow actions** via `/create-flow-action` for each selected flow
7. **Wire flows** via `/configure-start-task` — add steps, imports, and flow entries to config
8. **Set up `.env`** — remind the user to add API keys for any providers that need them (e.g. `JIRA_API_TOKEN`, `GITLAB_PRIVATE_TOKEN`)

## Minimal config (no git/ticket)

If you don't need git operations, ticket providers, worktrees, or projects, the config only needs the three required keys:

```js
import { createClaudeCodeAgent } from "../lib/providers/agents/claude-code.js";
import { createTmuxSessionManager } from "../lib/session/tmux.js";
import { createGhosttyTerminal } from "../lib/providers/terminals/ghostty.js";
import { quickTaskAction } from "./quick-task.js";

export default {
  agent: createClaudeCodeAgent(),
  sessionManager: createTmuxSessionManager({
    bin: "/opt/homebrew/bin/tmux",
    session: "tasks",
    terminal: createGhosttyTerminal(),
  }),
  flows: {
    quick: {
      label: "Quick Task",
      steps: [
        { type: "text", key: "projectPath", message: "Project path:" },
        { type: "text", key: "instruction", message: "What to do?" },
      ],
      action: quickTaskAction,
    },
  },
};
```

See `examples/minimal.config.js` for a complete working example.

## Adding a flow

1. Create action in `user/my-action.js` (see `/create-flow-action` skill)
2. Add to config:

```js
import { myAction } from "./my-action.js";

flows: {
  myFlow: {
    label: "My Flow",
    steps: [
      { type: "text", key: "input", message: "What to do?" },
      "ticketKey",  // reference to config.steps
    ],
    action: myAction,
  },
}
```

## Reusable steps

Define in `config.steps`, reference by string name in flows:

```js
import { ticketKeyStep } from "../lib/presets/steps/ticket.js";
import { projectKeysStep, userContextStep } from "../lib/presets/steps/common.js";

steps: {
  ticketKey: ticketKeyStep,
  projectKeys: projectKeysStep,
  userContext: userContextStep,
},
```

## Adding projects

```js
projects: {
  "my-app": {
    repoPath: "org/my-app",          // git remote path
    defaultBranch: "main",
    setup: nodeSetup,                 // from lib/presets/setup/node.js
  },
}
```

Or auto-discover:

```js
import { scanProjects } from "../lib/utils/scanProjects.js";
projects: scanProjects("/path/to/workspace", { setup: nodeSetup }),
```

## Built-in flows

```js
import { setupFlow } from "../lib/presets/flows/setup.js";
flows: {
  setup: setupFlow;
} // launches agent to modify config
```

## Environment variables

`.env` in project root or parent:

```
GITLAB_API_URL=...   GITLAB_PRIVATE_TOKEN=...
GITHUB_TOKEN=...
JIRA_API_URL=...     JIRA_USER_EMAIL=...     JIRA_API_TOKEN=...
LINEAR_API_KEY=...
AZURE_DEVOPS_ORG_URL=...  AZURE_DEVOPS_PAT=...
BITBUCKET_TOKEN=...  BITBUCKET_USERNAME=...
```

## Validation rules

1. `agent` must have `name` (string) and `buildCommand` (function)
2. `sessionManager` must implement all SessionManager methods: `launchTask`, `listWindows`, `closeWindow`, `switchToWindow`, `openWindow`, `isSessionRunning`, `ensureTuiWindow`, `openTerminalAttached`
3. Each flow must have `label` (string), `steps` (array), `action` (function)
4. String step references must exist in `config.steps`
5. Each step must have `type`, `key`, and `message`

## After changes

```bash
npm test && npm run lint
```

## Reference

See `examples/start-task.config.js` for a complete working config.
