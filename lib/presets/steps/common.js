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
 * Optional text step for additional context.
 * @type {import("../../types.js").WizardStep}
 */
export const userContextStep = {
  type: "text",
  key: "userContext",
  message: "Additional context? (optional, skip with Enter)",
  placeholder: "Focus on the API layer",
  optional: true,
};
