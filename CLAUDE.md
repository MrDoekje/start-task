# start-task

Config file: `user/start-task.config.js` (gitignored). Must export a default object.

## Required keys

- `agent` — `{ name: string, buildCommand: (promptFile) => string }`
- `sessionManager` — tmux session manager (see `/create-provider` skill)
- `flows` — `Record<string, { label, steps, action }>`

## Optional keys

The framework only validates the three required keys. Everything else (`git`, `taskProvider`, `projects`, `workspaceRoot`, `worktree`, `steps`, etc.) is passed through for your flow actions to use. See `examples/minimal.config.js`.

## Validation

1. `agent` must have `name` (string) and `buildCommand` (function)
2. `sessionManager` must implement all SessionManager methods
3. Each flow must have `label` (string), `steps` (array), `action` (function)
4. String step references in flows must exist in `config.steps`
5. Each entry in `config.steps` must have `type`, `key`, and `message`

## Skills

Use these skills for detailed guidance on each part:

- `/configure-start-task` — overall config structure, adding flows, wiring everything together
- `/create-provider` — create or swap agent, git, task, terminal, and session providers
- `/create-wizard-step` — create custom wizard steps (text, select, multiselect)
- `/create-flow-action` — write action functions, use utils, build prompts
- `/worktree-setup` — configure worktrees and project setup steps

## Environment

`.env` in project root or parent directory. Provider-specific (e.g., `GITLAB_API_URL`, `JIRA_API_TOKEN`).

## Testing

```bash
npm test          # vitest
npm run lint      # oxlint
```
