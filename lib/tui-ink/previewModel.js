/**
 * Framework-agnostic model for the flow preview panel: resolves a flow's steps
 * and summarizes its effective options into label/value rows.
 */

/** Resolve a step ref (string key into `config.steps`, or an inline object). */
export function resolveStep(step, config) {
  if (typeof step === "string") return config.steps?.[step];
  return step;
}

/**
 * Summarize a flow's effective options as `[label, value]` rows. Flow-level
 * `options` shallow-override config. Only present keys produce rows.
 */
export function summarizeOptions(config, flow) {
  const merged = { ...config, ...(flow.options ?? {}) };
  const rows = [];
  rows.push(["group", flow.group ?? "Other"]);
  if (merged.agent?.name) rows.push(["agent", merged.agent.name]);
  if (merged.git) rows.push(["git", merged.git.name ?? "configured"]);
  if (merged.taskProvider) rows.push(["tracker", merged.taskProvider.name ?? "configured"]);
  if (merged.worktree?.enabled) rows.push(["worktree", "enabled"]);
  return rows;
}

/**
 * Display label for a step in the preview: the message (or key), with a
 * trailing "(optional…)" tail and trailing colon stripped for readability.
 */
export function stepLabel(step) {
  if (!step) return "";
  return (step.message ?? step.key ?? "")
    .replace(/\s*\(optional[^)]*\)\s*$/i, "")
    .replace(/:\s*$/, "");
}
