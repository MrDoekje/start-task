# Skill: Create a flow action

Flow actions are async functions that run after the wizard completes. They receive the wizard answers and launch agent sessions.

## Basic structure

```js
// user/my-action.js

/**
 * @param {Record<string, any>} results - wizard answers keyed by step.key
 * @param {import("../lib/types.js").Config} config - full config object
 * @param {import("../lib/types.js").ActionUtils} utils - session + workflow utilities
 */
export async function myAction(results, config, utils) {
  const prompt = `Do something with: ${results.input}`;
  utils.launchTask("/path/to/project", prompt, "window-name");
}
```

Wire it into the config:

```js
import { myAction } from "./my-action.js";
flows: {
  myFlow: { label: "My Flow", steps: [...], action: myAction },
}
```

## Available utils

```js
// Launch an agent session in tmux (main purpose of most actions)
utils.launchTask(workingDirs, prompt, windowName);
// workingDirs: string or string[] — first dir gets the agent, extras get shell panes

// Git operations
utils.gitFetch(projectDir);
utils.ensureWorktree(projectDir, branchName); // returns worktree path
utils.runSetupSteps(projectDir, worktreeDir, steps); // copy .env, symlink node_modules, etc.

// Window management
utils.listWindows(); // [{ name, active, paneCount, status }]
utils.closeWindow(name);
utils.switchToWindow(name);
utils.openWindow(cwd, command, name);

// Validation
utils.validateProjectKeys(keys, Object.keys(config.projects));
utils.formatError(err); // format error for display

// Paths
utils.resolve(...paths); // Node.js path.resolve
utils.expandHome("~/foo"); // expands ~ to home directory
```

## Building prompts

Use the helpers from `lib/presets/prompts.js`:

```js
import { taskHeader, fieldSections, markdownSections } from "../lib/presets/prompts.js";

const prompt =
  taskHeader("work on", ticket.key, ticket.summary) +
  // → 'I need you to work on PROJ-42: "Fix the bug"\n\n'

  fieldSections(ticket, [
    { heading: "Details", field: (t) => `- Type: ${t.issueType}\n- Status: ${t.status}` },
    { heading: "Description", field: "description" },
    { heading: "Acceptance Criteria", field: (t) => t.customFields?.["Acceptance Criteria"] },
  ]) +
  // maps fields to ## sections, skips falsy values

  markdownSections([{ heading: "Context", body: results.userContext }]);
// raw ## heading + body pairs, skips falsy bodies
```

## Shared helpers

Put reusable prompt fragments in `user/shared.js`:

```js
// user/shared.js
import { fieldSections } from "../lib/presets/prompts.js";

export function ticketSections(ticket) {
  return fieldSections(ticket, [
    { heading: "Ticket Details", field: (t) => `- Type: ${t.issueType}\n- Status: ${t.status}` },
    { heading: "Description", field: "description" },
    { heading: "Acceptance Criteria", field: (t) => t.customFields?.["Acceptance Criteria"] },
  ]);
}
```

## Common patterns

**Fetch ticket + create branch + launch agent:**

```js
export async function startAction(results, config, utils) {
  const { ticketKey, projectKeys } = results;
  const ticket = await config.taskProvider.fetchTicket(ticketKey);
  const workspaceRoot = utils.expandHome(config.workspaceRoot);

  for (const key of projectKeys) {
    const dir = utils.resolve(workspaceRoot, key);
    let branch = await config.git.findBranch(config.projects[key], ticketKey);
    if (!branch) {
      branch = config.git.generateBranchName(ticketKey, ticket.summary);
      await config.git.createBranch(config.projects[key], branch);
    }
    utils.gitFetch(dir);
    const worktree = utils.ensureWorktree(dir, branch);
    utils.runSetupSteps(dir, worktree, config.projects[key].setup);
  }

  const prompt = taskHeader("work on", ticket.key, ticket.summary) + ticketSections(ticket);
  utils.launchTask(worktreeDir, prompt, `task-${ticketKey}`);
}
```

**Multi-project with multiple shell panes:**

```js
// Pass array of dirs — first gets agent, rest get shell panes
utils.launchTask(
  projectKeys.map((k) => utils.resolve(workspaceRoot, k)),
  prompt,
  `task-${ticketKey}`,
);
```

## Simple flow (no ticket/git)

When you don't need a ticket provider or git operations, the action just takes wizard answers and launches the agent directly:

```js
import { markdownSections } from "../lib/presets/prompts.js";

export async function quickAction(results, config, utils) {
  const cwd = utils.expandHome(results.projectPath);

  const prompt =
    `I need you to: ${results.instruction}\n\n` +
    markdownSections([
      { heading: "Tools at your disposal", body: "- Use `npm test` to verify changes\n- Read `CLAUDE.md` for project conventions" },
      { heading: "Workflow", body: "1. Read the code\n2. Implement\n3. Test" },
    ]);

  utils.launchTask(cwd, prompt, "quick-task");
}
```

Wire it in with inline steps — no `config.steps` or external providers needed:

```js
flows: {
  quick: {
    label: "Quick Task",
    steps: [
      { type: "text", key: "projectPath", message: "Project path:" },
      { type: "text", key: "instruction", message: "What to do?" },
    ],
    action: quickAction,
  },
}
```

## Tool-aware prompts

Agents perform better when prompts explicitly name the tools available. Here are patterns for different tool types:

**Referencing specialist agents** (Claude Code sub-agents):

```js
const prompt = `...
## Available agents
- Use the \`backend-dev\` agent for NestJS service/controller changes
- Use the \`frontend-dev\` agent for Vue component work
`;
```

**Referencing MCP tools** (external integrations):

```js
const prompt = `...
## MCP tools
- Use the \`jira\` MCP to transition the ticket to "In Review" when done
- Use the \`slack\` MCP to post a summary in #dev when the PR is ready
`;
```

**Referencing CLI tools**:

```js
const prompt = `...
## Tools at your disposal
- Run \`npm test\` to verify changes
- Run \`npm run lint\` to check style
- Run \`npx playwright test\` for E2E tests
`;
```

**Combined workflow footer** — append to any prompt to give the agent a full toolkit:

```js
export const WORKFLOW_FOOTER = `
## Workflow
1. Read the relevant code and \`CLAUDE.md\` before changing anything
2. Implement the requested changes
3. Run \`npm test\` and \`npm run lint\` to verify
4. Use the \`jira\` MCP to move the ticket to "In Review"

If any step fails twice, move on and note what failed.`;
```

## Reference

See `examples/start.js` and `examples/investigate.js` for full ticket+git examples, and `examples/quick-task.js` for a minimal no-ticket example.
