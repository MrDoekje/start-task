/**
 * Multiselect step that lists all projects from config.
 * @type {import("../../types.js").WizardStep}
 */
export const projectKeysStep = {
  type: "multiselect",
  key: "projectKeys",
  message: "Select project(s):",
  options: (config) => Object.keys(config.projects).map((key) => ({ value: key, label: key })),
  required: true,
};

/**
 * Optional text step for overriding the base branch.
 * Defaults to the project's defaultBranch when left empty.
 * @type {import("../../types.js").WizardStep}
 */
export const baseBranchStep = {
  type: "text",
  key: "baseBranch",
  message: "Base branch (leave empty for project default):",
  placeholder: "main",
  optional: true,
  transform: (value) => value?.trim() || undefined,
};

/**
 * Optional editor step for additional context (opens $EDITOR for multi-line input).
 * @type {import("../../types.js").WizardStep}
 */
export const userContextStep = {
  type: "editor",
  key: "userContext",
  message: "Additional context (optional)",
  fileName: "context.md",
  optional: true,
};
