# Create a wizard step

Wizard steps are the prompts shown to users when they pick a flow. Each step collects one piece of input.

## Step shape

```js
/** @type {import("../lib/types.js").WizardStep} */
const myStep = {
  type: "text", // "text" | "select" | "multiselect"
  key: "myKey", // result key — action receives results.myKey
  message: "Your prompt?",
};
```

## Text step

```js
{
  type: "text",
  key: "ticketKey",
  message: "Ticket key or URL?",
  placeholder: "PROJ-1234",           // greyed-out hint
  optional: false,                     // if true, empty input is allowed
  validate(value) {                    // runs before transform
    if (!value?.trim()) return "Required.";
  },
  transform(value, utils, config) {    // transform the raw input
    return config.taskProvider.parseTicketKey(value.trim());
  },
  postValidate(value, utils, config) { // runs after transform
    if (!config.taskProvider.ticketKeyPattern.test(value)) {
      return "Invalid ticket key.";
    }
  },
}
```

**Flow:** `validate` -> user sees error or input accepted -> `transform` -> `postValidate` -> stored in `results[key]`.

Both `transform` and `postValidate` receive `(value, utils, config)` where `utils` is the ActionUtils object and `config` is the full config.

## Select step

```js
{
  type: "select",
  key: "priority",
  message: "Priority?",
  options: [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
}
```

Options can be a function of config for dynamic lists:

```js
{
  type: "select",
  key: "project",
  message: "Which project?",
  options: (config) => Object.keys(config.projects).map((k) => ({ value: k, label: k })),
}
```

## Multiselect step

```js
{
  type: "multiselect",
  key: "projectKeys",
  message: "Select project(s):",
  required: true,        // at least one must be selected
  options: (config) => Object.keys(config.projects).map((k) => ({ value: k, label: k })),
}
```

Result is an array of selected values.

## Using steps

**Inline in a flow:**

```js
flows: {
  myFlow: {
    steps: [myStep, anotherStep],
    ...
  },
}
```

**As reusable references:**

```js
steps: { ticket: myStep },
flows: {
  myFlow: { steps: ["ticket", anotherInlineStep], ... },
}
```

## Built-in presets

```js
import { ticketKeyStep } from "../lib/presets/steps/ticket.js";
import { projectKeysStep, userContextStep } from "../lib/presets/steps/common.js";
```

- `ticketKeyStep` — text input, parses ticket keys/URLs via `config.taskProvider`
- `projectKeysStep` — multiselect of `config.projects` keys
- `userContextStep` — optional text for additional context

## Option steps (optionSteps)

Option steps are wizard steps for overriding config options at runtime. They're defined at the config level (not per-flow) and shown after the flow's wizard steps via a multiselect.

Unlike regular wizard steps, option steps don't need a `key` — the key is derived from the `optionSteps` record key:

```js
optionSteps: {
  agent: {
    type: "select",
    label: "Agent",                 // shown in the override multiselect
    message: "Which agent?",        // shown when actually selecting
    options: [
      { value: createClaudeCodeAgent(), label: "Claude Code" },
      { value: createGeminiAgent(), label: "Gemini" },
    ],
  },
},
```

When a user selects an option override, the result is automatically promoted into the resolved config (e.g. `config.agent` becomes the selected agent) and removed from `results`. Actions don't need to handle this — they just use `config.agent`.

Flows control which option steps are shown via `flow.overrides`:

- `true` (default) — all option steps shown
- `false` — no option steps shown
- `{ agent: false }` — disable specific ones, rest enabled

See `docs/configure-start-task.md` for the full option cascade explanation.

## Wizard step key matching options

If a regular flow wizard step has a `key` that matches a config option name (e.g. `key: "agent"`), the result is also auto-promoted into the resolved config. This lets you make any option part of the normal wizard flow:

```js
steps: [
  {
    type: "select",
    key: "agent",       // matches config.agent → auto-promoted
    message: "Agent?",
    options: [
      { value: createClaudeCodeAgent(), label: "Claude Code" },
      { value: createGeminiAgent(), label: "Gemini" },
    ],
  },
  { type: "text", key: "instruction", message: "What to do?" },
],
// Action receives: results = { instruction }, config.agent = selected agent
```

## Wizard navigation

Users can press Ctrl+C to go back to the previous step (answer is preserved as initial value). Ctrl+C at the first step cancels the flow.
