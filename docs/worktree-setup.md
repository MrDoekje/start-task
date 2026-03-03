# Configure worktrees and project setup

Worktrees let each task work on an isolated copy of the repo without switching branches.

## Worktree config

```js
worktree: {
  enabled: true,
  path: (projectDir, branchName) => `${projectDir}/worktrees/${branchName}`,
  // default if omitted: ${projectDir}/worktrees/${branchName}
},
```

The `path` function is optional. If not provided, worktrees go to `<projectDir>/worktrees/<branchName>`.

## Project setup steps

After a worktree is created, setup steps copy or symlink files from the main repo:

```js
projects: {
  "my-app": {
    repoPath: "org/my-app",
    defaultBranch: "main",
    setup: [
      { action: "copy", pattern: ".env*", excludePattern: ".env*.example", description: "env files" },
      { action: "symlink", pattern: "node_modules", description: "node_modules" },
    ],
  },
}
```

### Actions

- `copy` — copies matching files from the main repo into the worktree
- `symlink` — creates symlinks from the worktree to the main repo

### Fields

- `action` — `"copy"` or `"symlink"`
- `pattern` — glob pattern to match (e.g., `.env*`, `node_modules`)
- `excludePattern` — optional glob to exclude from matches
- `description` — human-readable label shown during setup

## Built-in presets

```js
import { nodeSetup, copyEnvFiles, symlinkNodeModules } from "../lib/presets/setup/node.js";

// nodeSetup = [copyEnvFiles, symlinkNodeModules]
// copyEnvFiles = { action: "copy", pattern: ".env*", excludePattern: ".env*.example", description: "env files" }
// symlinkNodeModules = { action: "symlink", pattern: "node_modules", description: "node_modules" }
```

## Using in actions

```js
utils.ensureWorktree(projectDir, branchName); // creates worktree, returns path
utils.runSetupSteps(projectDir, worktreeDir, projectConfig.setup); // runs copy/symlink steps
```

## Auto-discovering projects

```js
import { scanProjects } from "../lib/utils/scanProjects.js";

// Scans dir for subdirs with .git/, reads remote URL + default branch
projects: scanProjects("/path/to/workspace", { setup: nodeSetup }),
// Returns: { "repo-name": { repoPath: "org/repo-name", defaultBranch: "main", setup: [...] } }
```

You can merge auto-discovered with manual overrides:

```js
projects: {
  ...scanProjects("/path/to/workspace", { setup: nodeSetup }),
  "special-project": { repoPath: "org/special", defaultBranch: "develop" },
},
```
