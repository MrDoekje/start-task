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
import { ticketKeyStep } from "../lib/presets/steps/jira.js";
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
JIRA_API_URL=...     JIRA_USER_EMAIL=...     JIRA_API_TOKEN=...
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
