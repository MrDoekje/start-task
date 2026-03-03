# start-task

A terminal tool for managing AI coding agent sessions. Run it, pick a workflow from the menu, and an agent opens in its own window — ready to work. Run as many tasks in parallel as you want, each in its own isolated session, and switch between them from the TUI.

## Getting started

```bash
npm install
node cli.js
```

That's it. On first run a setup wizard walks you through picking your agent and terminal. A working config is generated and you're dropped into the TUI menu.

## What you get out of the box

The initial config is deliberately barebones — just enough to launch agent sessions. The real power is making it yours. The built-in **Setup** flow launches an agent that modifies the config for you. Tell it what you want ("add Jira integration", "add my projects", "create a code review flow") and it wires everything up.

You're encouraged to customize everything. This tool is meant to be shaped around how _you_ work.

## Why use this

**Parallel agent sessions.** Each task gets its own window with the agent on one side and shell pane(s) on the other. Start a task on your backend, start another on your frontend, investigate a third ticket — all running simultaneously. Switch between them from the menu.

**Any agent, any workflow.** The tool doesn't lock you into one agent or one way of working. Define exactly what happens when you pick a menu item — what data gets fetched, what branches get created, what prompt the agent receives, which projects it works in.

**Fully customizable.** Every part of the system is pluggable and replaceable:

### Agents

- Claude Code
- Codex
- Aider
- Gemini CLI
- OpenCode
- Or implement your own

### Terminals

- Ghostty
- iTerm2
- Kitty
- Or implement your own

### Git providers

- GitLab
- Or implement your own

### Task providers

- Jira (with custom field support)
- Or implement your own

### Workflows

- Define as many menu items as you need
- Each collects inputs through wizard steps (text, single-select, multi-select)
- Then runs whatever logic you want — fetch tickets, create branches, set up worktrees, build prompts, launch agents
- Ship with reusable presets for common patterns (Jira steps, project selection, prompt builders, Node.js worktree setup)

## Configuring

Use the **Setup** flow from the TUI menu. It launches an agent with full context about the config shape and available options. Describe what you want in plain language and it makes the changes.

For reference, `examples/` contains a complete working config with Jira integration, GitLab branches, multi-project worktrees, and start/investigate flows. Copy it to `user/` as a starting point if you prefer to configure manually.

## Environment variables

If you use providers that need API keys (Jira, GitLab, etc.), create a `.env` file in the project root:

```
GITLAB_API_URL=https://gitlab.com/api/v4
GITLAB_PRIVATE_TOKEN=glpat-...
JIRA_API_URL=https://yourorg.atlassian.net
JIRA_USER_EMAIL=you@example.com
JIRA_API_TOKEN=...
```
