# start-task

Config file: `user/start-task.config.js` (gitignored). Must export a default object.

## Required keys

- `agent` — `{ name: string, buildCommand: (promptFile) => string }`
- `sessionManager` — tmux session manager (see `docs/create-provider.md`)
- `flows` — `Record<string, { label, steps, action }>`

## Optional keys

The framework only validates the three required keys. Everything else (`git`, `taskProvider`, `projects`, `workspaceRoot`, `worktree`, `steps`, etc.) is passed through for your flow actions to use.

## Documentation

Detailed guides in the `docs/` directory:

- `docs/configure-start-task.md` — config structure, first-run setup, validation
- `docs/create-provider.md` — agent, git, task, terminal, session providers
- `docs/create-wizard-step.md` — wizard step types (text, select, multiselect)
- `docs/create-flow-action.md` — flow action patterns, utilities, prompt building
- `docs/worktree-setup.md` — worktree config and project setup

## Testing

```bash
npm test          # vitest
npm run lint      # oxlint
```
