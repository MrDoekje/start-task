// ── Framework types (required by the TUI and cli.js) ─────────────

/**
 * @typedef {object} AgentProvider
 * @property {string} name - Agent name (e.g., "claude-code", "codex", "aider")
 * @property {(promptFile: string) => string} buildCommand - Build a shell command that reads the prompt file and launches the agent
 * @property {string[]} [args] - Extra CLI arguments passed to the agent binary
 */

/**
 * @typedef {object} SessionManager
 * @property {(workingDirs: string | string[], prompt: string, windowName: string, buildCommand: (promptFile: string) => string) => void} launchTask - Launch a task window with the agent
 * @property {() => Array} listWindows - List active task windows
 * @property {(name: string) => void} closeWindow - Close a window by name
 * @property {(name: string) => void} switchToWindow - Switch to a window by name
 * @property {(cwd: string, command: string, windowName: string) => void} openWindow - Open a new window running a command
 * @property {() => boolean} isSessionRunning - Check if the session is running
 * @property {() => boolean} hasAttachedClient - Check if a terminal client is already attached
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
 * @property {Record<string, OptionStep>} [optionSteps] - Wizard step definitions for user-overridable options (keyed by option name, e.g. "agent", "git")
 */

/**
 * @typedef {object} FlowConfig
 * @property {string} label - Display label for the flow in the menu
 * @property {(WizardStep | string)[]} steps - Wizard step definitions (inline objects or string references to config.steps keys)
 * @property {(results: Record<string, any>, config: Config, utils: ActionUtils) => Promise<void>} action - Action function to run after wizard completes
 * @property {Record<string, any>} [options] - Per-flow overrides (agent, git, worktree, projects, etc.). Shallow-merged on top of config-level options.
 * @property {boolean | Record<string, boolean>} [overrides] - Controls which optionSteps are shown after the wizard. true = all (default), false = none, object = per-key enable/disable.
 */

/**
 * @typedef {object} WizardStep
 * @property {"text" | "editor" | "multiselect" | "select"} type - Prompt step type ("editor" opens $EDITOR for multi-line input)
 * @property {string} key - Key to store the result under
 * @property {string} message - Prompt message shown to the user
 * @property {string} [placeholder] - Placeholder text for text inputs
 * @property {boolean} [optional] - Whether the step can be skipped with empty input
 * @property {boolean} [required] - Whether at least one selection is required for multiselect
 * @property {string} [fileName] - File name for editor temp file (default: "input.md")
 * @property {string} [editorHeader] - Custom header comment for editor (lines starting with # are stripped)
 * @property {((value: string) => string | undefined)} [validate] - Pre-transform validation function
 * @property {((value: string, utils: ActionUtils, config: Config) => string)} [transform] - Value transformer function
 * @property {((value: string, utils: ActionUtils, config: Config) => string | undefined)} [postValidate] - Post-transform validation function
 * @property {((config: Config) => Array<{value: string, label: string}>) | Array<{value: string, label: string}>} [options] - Options for select/multiselect steps
 * @property {((results: Record<string, any>) => boolean)} [when] - Conditional function; step is skipped when it returns false
 */

/**
 * Wizard step definition for a user-overridable option.
 * Same as WizardStep but without `key` (derived from the optionSteps record key)
 * and with an optional `label` for the override multiselect.
 *
 * @typedef {object} OptionStep
 * @property {"text" | "editor" | "multiselect" | "select"} type - Prompt step type
 * @property {string} message - Prompt message shown to the user when overriding
 * @property {string} [label] - Display label in the override multiselect (defaults to the option key)
 * @property {string} [placeholder] - Placeholder text for text inputs
 * @property {boolean} [optional] - Whether the step can be skipped with empty input
 * @property {boolean} [required] - Whether at least one selection is required for multiselect
 * @property {((value: string) => string | undefined)} [validate] - Pre-transform validation function
 * @property {((value: string, utils: ActionUtils, config: Config) => string)} [transform] - Value transformer function
 * @property {((value: string, utils: ActionUtils, config: Config) => string | undefined)} [postValidate] - Post-transform validation function
 * @property {((config: Config) => Array<{value: any, label: string}>) | Array<{value: any, label: string}>} [options] - Options for select/multiselect steps
 */

/**
 * @typedef {object} ActionUtils
 * @property {typeof import("./git.js").gitFetch} gitFetch - Run git fetch origin in a project directory
 * @property {(projectDir: string, branchName: string, options?: { startPoint?: string }) => string} ensureWorktree - Ensure a git worktree exists for a branch
 * @property {typeof import("./git.js").runSetupSteps} runSetupSteps - Run worktree setup steps (copy/symlink)
 * @property {(workingDirs: string | string[], prompt: string, windowName: string, options?: { agent?: AgentProvider }) => void} launchTask - Launch a task window with the agent
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

// ── Analytics types ──

/**
 * @typedef {object} AnalyticsProvider
 * @property {string} name - Provider name (e.g., "claude-code", "aider")
 * @property {(options: AnalyticsOptions) => Promise<AnalyticsResult>} analyze - Run analysis and return normalized results
 */

/**
 * @typedef {object} AnalyticsOptions
 * @property {{ from: Date, to: Date }} dateRange - Time window to analyze
 * @property {"day" | "week" | "month"} groupBy - Grouping granularity for time series
 * @property {string[]} [projectFilter] - Filter by project path substrings
 */

/**
 * @typedef {object} AnalyticsResult
 * @property {string} providerName - Which provider produced this result
 * @property {{ from: Date, to: Date }} period - Actual period covered
 * @property {{ sessions: number, messages: number, tokens: TokenBreakdown, toolCalls: number }} totals - Aggregate totals for the period
 * @property {Array<{ name: string, calls: number, errors: number, errorRate: number }>} tools - Tool usage sorted by calls desc
 * @property {Array<{ path: string, sessions: number, messages: number, tokens: TokenBreakdown }>} projects - Per-project breakdown
 * @property {Array<{ id: string, project: string, startedAt: Date, duration: number, messages: number, tokens: TokenBreakdown, model: string, topTools: string[] }>} sessions - Individual sessions
 * @property {Array<{ date: string, sessions: number, messages: number, tokens: TokenBreakdown, toolCalls: number }>} timeSeries - Grouped time series
 * @property {Array<{ model: string, sessions: number, messages: number, tokens: TokenBreakdown }>} models - Per-model breakdown sorted by messages desc
 * @property {Array<{ type: string, dispatches: number, tokens: TokenBreakdown }>} subagents - Subagent usage by type sorted by dispatches desc
 * @property {Array<{ name: string, invocations: number }>} skills - Skill invocations sorted by count desc
 * @property {{ toolErrorRate: number, topFailingTools: Array<{ name: string, errors: number, total: number }>, avgSessionDuration: number, avgMessagesPerSession: number }} health - Error rates and session health metrics
 */

/**
 * @typedef {object} TokenBreakdown
 * @property {number} input - Input tokens consumed
 * @property {number} output - Output tokens generated
 * @property {number} cacheRead - Tokens read from prompt cache
 * @property {number} cacheCreation - Tokens written to prompt cache
 */

export {};
