// ── Framework types (required by the TUI and launch.js) ─────────────

/**
 * @typedef {object} AgentProvider
 * @property {string} name - Agent name (e.g., "claude-code", "codex", "aider")
 * @property {(promptFile: string) => string} buildCommand - Build a shell command that reads the prompt file and launches the agent
 */

/**
 * @typedef {object} SessionManager
 * @property {(workingDirs: string | string[], prompt: string, windowName: string, buildCommand: (promptFile: string) => string) => void} launchTask - Launch a task window with the agent
 * @property {() => Array} listWindows - List active task windows
 * @property {(name: string) => void} closeWindow - Close a window by name
 * @property {(name: string) => void} switchToWindow - Switch to a window by name
 * @property {(cwd: string, command: string, windowName: string) => void} openWindow - Open a new window running a command
 * @property {() => boolean} isSessionRunning - Check if the session is running
 * @property {(tuiCommand: string) => void} ensureTuiWindow - Ensure a TUI window exists
 * @property {() => void} openTerminalAttached - Open a terminal attached to the session
 */

/**
 * Minimal config shape required by the framework.
 * Flow actions receive the full config object and may access any additional
 * keys (git providers, task providers, projects, prompts, etc.) that the
 * user defines — the framework does not validate or depend on those.
 *
 * @typedef {object} Config
 * @property {AgentProvider} agent - Agent provider for building agent commands
 * @property {SessionManager} sessionManager - Session manager for window management
 * @property {Record<string, FlowConfig>} flows - Flow definitions keyed by name
 * @property {Record<string, WizardStep>} [steps] - Reusable wizard step definitions keyed by name
 */

/**
 * @typedef {object} FlowConfig
 * @property {string} label - Display label for the flow in the menu
 * @property {(WizardStep | string)[]} steps - Wizard step definitions (inline objects or string references to config.steps keys)
 * @property {(results: Record<string, any>, config: Config, utils: ActionUtils) => Promise<void>} action - Action function to run after wizard completes
 */

/**
 * @typedef {object} WizardStep
 * @property {"text" | "multiselect" | "select"} type - Prompt step type
 * @property {string} key - Key to store the result under
 * @property {string} message - Prompt message shown to the user
 * @property {string} [placeholder] - Placeholder text for text inputs
 * @property {boolean} [optional] - Whether the step can be skipped with empty input
 * @property {boolean} [required] - Whether at least one selection is required for multiselect
 * @property {((value: string) => string | undefined)} [validate] - Pre-transform validation function
 * @property {((value: string, utils: ActionUtils, config: Config) => string)} [transform] - Value transformer function
 * @property {((value: string, utils: ActionUtils, config: Config) => string | undefined)} [postValidate] - Post-transform validation function
 * @property {((config: Config) => Array<{value: string, label: string}>) | Array<{value: string, label: string}>} [options] - Options for select/multiselect steps
 */

/**
 * @typedef {object} ActionUtils
 * @property {typeof import("./git.js").gitFetch} gitFetch - Run git fetch origin in a project directory
 * @property {(projectDir: string, branchName: string) => string} ensureWorktree - Ensure a git worktree exists for a branch
 * @property {typeof import("./git.js").runSetupSteps} runSetupSteps - Run worktree setup steps (copy/symlink)
 * @property {(workingDirs: string | string[], prompt: string, windowName: string) => void} launchTask - Launch a task window with the agent
 * @property {() => Array} listWindows - List active task windows
 * @property {(name: string) => void} closeWindow - Close a window by name
 * @property {(name: string) => void} switchToWindow - Switch to a window by name
 * @property {(cwd: string, command: string, windowName: string) => void} openWindow - Open a new window running a command
 * @property {typeof import("./validation.js").validateProjectKeys} validateProjectKeys - Validate project keys against known projects
 * @property {typeof import("./validation.js").formatError} formatError - Format an error into a detailed log string
 * @property {typeof import("path").resolve} resolve - Node.js path.resolve
 * @property {(path: string) => string} expandHome - Expand leading ~ to the user's home directory
 */

/**
 * @typedef {object} TerminalProvider
 * @property {string} name - Terminal name (e.g., "ghostty", "iterm", "kitty")
 * @property {(bin: string, session: string) => string} openCommand - Build a shell command that opens a new terminal window attached to the session
 */

// ── Workflow types (used by providers and flow actions, not by the framework) ──

/**
 * @typedef {object} Ticket
 * @property {string} key - Ticket key (e.g., "PROJ-1234")
 * @property {string} summary - Ticket title
 * @property {string} description - Plain text description
 * @property {string} status - Status name
 * @property {string} issueType - Issue type name
 * @property {Record<string, string>} [customFields] - Provider-specific extra fields (e.g., "Acceptance Criteria", "Outline")
 */

/**
 * @typedef {object} ProjectConfig
 * @property {string} repoPath - Repository path (e.g., "org/my-project")
 * @property {string} defaultBranch - Default branch name
 * @property {SetupStep[]} [setup] - Worktree setup steps
 */

/**
 * @typedef {object} SetupStep
 * @property {"copy" | "symlink"} action - Action to perform
 * @property {string} pattern - Glob pattern to match files or directories
 * @property {string} [excludePattern] - Glob pattern to exclude from matches
 * @property {string} description - Human-readable description of what is being set up
 */

/**
 * @typedef {object} GitProvider
 * @property {(ticketKey: string, summary: string) => string} generateBranchName - Generate a branch name from ticket key and summary
 * @property {(projectConfig: ProjectConfig, ticketKey: string) => Promise<string|null>} findBranch - Find an existing branch matching a ticket key
 * @property {(projectConfig: ProjectConfig, branchName: string) => Promise<void>} createBranch - Create a branch on the remote
 * @property {(projectConfig: ProjectConfig, branchName: string, ticket: Ticket) => Promise<string>} createPR - Create a pull/merge request, returns URL
 */

/**
 * @typedef {object} TaskProvider
 * @property {RegExp} ticketKeyPattern - Pattern to validate ticket keys
 * @property {(input: string | null | undefined) => string | null | undefined} parseTicketKey - Extract ticket key from input string or URL
 * @property {(ticketKey: string) => Promise<Ticket>} fetchTicket - Fetch a ticket by key
 */

/**
 * @typedef {object} WorktreeConfig
 * @property {boolean} enabled - Whether worktrees are enabled
 * @property {(projectDir: string, branchName: string) => string} [path] - Custom worktree path function
 */

export {};
