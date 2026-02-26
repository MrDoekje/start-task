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

## Reference

See `examples/start.js` and `examples/investigate.js` for complete working examples.
