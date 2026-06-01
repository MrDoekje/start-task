/**
 * Framework-agnostic wizard navigation model. Encodes which step is active,
 * how steps are skipped via their `when(results, config)` predicate, and the
 * per-step-type shortcut hints — independent of any UI toolkit.
 */

/**
 * Find the next non-skipped step index from `from`, moving by `dir` (+1/-1).
 * A step is skipped when its `when(results, config)` returns false. Returns
 * `steps.length` (forward sentinel) or -1 (backward sentinel) when no step is
 * reachable in that direction.
 *
 * @param {import("../types.js").WizardStep[]} steps
 * @param {number} from
 * @param {number} dir
 * @param {Record<string, any>} results
 * @param {import("../types.js").Config} config
 */
export function nextActiveIndex(steps, from, dir, results, config) {
  let i = from;
  while (i >= 0 && i < steps.length) {
    const step = steps[i];
    if (!step.when || step.when(results, config)) return i;
    i += dir;
  }
  return dir > 0 ? steps.length : -1;
}

/** Strip a trailing colon (and surrounding space) from a prompt message. */
export function cleanMessage(msg) {
  if (!msg) return "";
  return msg.replace(/:\s*$/, "");
}

/**
 * Shortcut hints for a step, as `[key, label]` pairs. The set depends on the
 * step type; text steps add a "clean" hint when the step defines `clean`.
 */
export function stepShortcuts(step) {
  switch (step.type) {
    case "text": {
      const shortcuts = [["↵", "continue"], ["^W", "del word"], ["^E", "editor"]];
      if (step.clean) shortcuts.push(["tab", "clean"]);
      shortcuts.push(["esc", "back"]);
      return shortcuts;
    }
    case "editor": return [["esc", "back"]];
    case "select": return [["↵", "select"], ["/", "filter"], ["esc", "back"]];
    case "multiselect":
      return [["space", "toggle"], ["↵", "continue"], ["/", "filter"], ["esc", "back"]];
    case "multiline":
      return [["↵", "newline"], ["^D", "submit"], ["^W", "del word"], ["esc", "back"]];
    default: return [["esc", "back"]];
  }
}
