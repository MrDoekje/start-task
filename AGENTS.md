# start-task

Config file: `user/start-task.config.js` (gitignored). Must export a default object.

## Option cascade

Everything on the config that isn't a framework key (`sessionManager`, `flows`, `steps`, `optionSteps`) is an **option**. Options cascade through layers — each layer wins over the previous:

```
config → flow.options → wizard steps → option overrides (optionSteps)
```

Any option (agent, git, projects, worktree, or any custom key) can be set globally, overridden per-flow, and overridden by the user at runtime. Adding new options requires zero framework changes.

## Required keys

- `agent` — `{ name: string, buildCommand: (promptFile) => string }`
- `sessionManager` — tmux session manager (see `docs/create-provider.md`)
- `flows` — `Record<string, { label, steps, action }>`

## Optional keys

- `steps` — reusable wizard step definitions
- `optionSteps` — wizard steps for user-overridable options (keyed by option name)

Everything else (`git`, `taskProvider`, `projects`, `workspaceRoot`, `worktree`, etc.) is an option that participates in the cascade.

## Flow properties

- `label` (string), `steps` (array), `action` (function) — required
- `options` (object) — static per-flow overrides, e.g. `{ agent: createGeminiAgent() }`
- `overrides` (boolean or object) — controls which `optionSteps` are shown: `true` (default), `false`, or `{ agent: false }`

## Documentation

Detailed guides in the `docs/` directory:

- `docs/configure-start-task.md` — config structure, option cascade, first-run setup, validation
- `docs/create-provider.md` — agent, git, task, terminal, session providers
- `docs/create-wizard-step.md` — wizard step types (text, select, multiselect)
- `docs/create-flow-action.md` — flow action patterns, utilities, prompt building
- `docs/worktree-setup.md` — worktree config and project setup

## Testing

```bash
npm test          # vitest
npm run lint      # oxlint
```
