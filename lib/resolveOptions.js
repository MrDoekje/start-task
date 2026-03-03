const FRAMEWORK_KEYS = new Set(["sessionManager", "flows", "steps", "optionSteps"]);

/**
 * Extracts all non-framework keys from the config object.
 * Framework keys (sessionManager, flows, steps) are excluded.
 * Everything else (agent, git, projects, worktree, taskProvider, etc.) is an "option."
 * @param {Record<string, any>} config
 * @returns {Record<string, any>}
 */
export function extractOptions(config) {
  const options = {};
  for (const key of Object.keys(config)) {
    if (!FRAMEWORK_KEYS.has(key)) {
      options[key] = config[key];
    }
  }
  return options;
}

/**
 * Three-layer shallow merge: config options → flow options → wizard results.
 * Wizard results whose keys match an option key are "promoted" into the resolved
 * options and removed from the returned results object.
 *
 * @param {Record<string, any>} configOptions - Options extracted from the config
 * @param {Record<string, any>} [flowOptions] - Per-flow overrides (flow.options)
 * @param {Record<string, any>} [wizardResults] - Raw wizard results
 * @returns {{ resolvedOptions: Record<string, any>, results: Record<string, any> }}
 */
export function resolveOptions(configOptions, flowOptions, wizardResults) {
  const merged = { ...configOptions, ...flowOptions };

  if (!wizardResults) {
    return { resolvedOptions: merged, results: {} };
  }

  const results = {};
  const optionKeys = new Set(Object.keys(merged));

  for (const [key, value] of Object.entries(wizardResults)) {
    if (optionKeys.has(key)) {
      merged[key] = value;
    } else {
      results[key] = value;
    }
  }

  return { resolvedOptions: merged, results };
}
