# start-task

Config file: `user/start-task.config.js` (gitignored). Must export a default object.

## Option cascade

Everything on the config that isn't a framework key (`sessionManager`, `flows`, `steps`, `optionSteps`) is an **option**. Options cascade through layers — each layer wins over the previous:

```
config → flow.options → wizard steps → option overrides (optionSteps)
```

This means any option (agent, git, projects, worktree, or any custom key) can be set globally, overridden per-flow, and optionally overridden by the user at runtime — with zero framework changes needed for new options.

## Required keys

- `agent` — `{ name: string, buildCommand: (promptFile) => string }`
- `sessionManager` — tmux session manager (see `/create-provider` skill)
- `flows` — `Record<string, { label, steps, action }>`

## Optional keys

- `steps` — `Record<string, WizardStep>` reusable wizard step definitions
- `optionSteps` — `Record<string, OptionStep>` wizard steps for user-overridable options (shown after flow steps, keyed by option name)

Everything else (`git`, `taskProvider`, `projects`, `workspaceRoot`, `worktree`, etc.) is an option — passed through for flow actions to use and participates in the cascade. See `examples/minimal.config.js`.

## Flow properties

- `label` (string) — menu display name
- `steps` (array) — wizard step definitions or string references to `config.steps`
- `action` (function) — `(results, config, utils) => Promise<void>`
- `options` (object, optional) — static per-flow overrides, e.g. `{ agent: createGeminiAgent() }`
- `overrides` (boolean or object, optional) — controls which `optionSteps` are shown after wizard: `true` (default, all), `false` (none), or `{ agent: false }` (per-key)

## Validation

1. `agent` must have `name` (string) and `buildCommand` (function)
2. `sessionManager` must implement all SessionManager methods
3. Each flow must have `label` (string), `steps` (array), `action` (function)
4. String step references in flows must exist in `config.steps`
5. Each entry in `config.steps` must have `type`, `key`, and `message`
6. `flow.options` must be a plain object if present; `flow.options.agent` must have valid `name` and `buildCommand`
7. `flow.overrides` must be a boolean or plain object if present
8. Each entry in `config.optionSteps` must have `type` and `message`

## Skills

Local skills (in `docs/`) cover how to extend start-task itself:

- `/configure-start-task` — overall config structure, adding flows (`docs/configure-start-task.md`)
- `/create-provider` — create or swap providers (`docs/create-provider.md`)
- `/create-wizard-step` — custom wizard steps (`docs/create-wizard-step.md`)
- `/create-flow-action` — write action functions, build prompts (`docs/create-flow-action.md`)
- `/worktree-setup` — worktrees and project setup (`docs/worktree-setup.md`)

MR and investigation flows delegate to skills installed from a shared AI skill marketplace:

- `/describe-mr`, `/review-mr`, `/resolve-threads` — invoked by the MR flows in `user/mr.js`
- `/investigate` — invoked by the Investigate flow in `user/investigate.js`

These require `glab auth login` on the host (the skills use `glab` for GitLab API access).

## Environment

`.env` in project root or parent directory. Provider-specific (e.g., `GITLAB_API_URL`, `JIRA_API_TOKEN`).

## Testing

```bash
npm test          # vitest
npm run lint      # oxlint
```

`test/contract/` is a framework-agnostic **behavioral contract suite** — an
executable spec of how the app behaves, independent of the UI toolkit. Treat it
as do-not-modify: if a refactor breaks a contract test, fix the code, not the
test. See `test/contract/README.md`. The UI logic it pins lives in plain modules
(`lib/tui-ink/*Model.js`, `*Buffer.js`, `listNav.js`, `windowStatus.js`) that the
`.jsx` components only render — keep new UI logic there, not inline in components.
