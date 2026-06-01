/**
 * Framework-agnostic flow-orchestration helpers: resolving a flow's step
 * references, deciding whether a wizard would render, and which option-override
 * steps apply. The option-cascade math itself lives in `../resolveOptions.js`.
 */

/**
 * Resolve a flow's step list: string entries are looked up in `config.steps`
 * (throwing if missing); inline step objects pass through unchanged.
 *
 * @param {Array<string | object>} flowSteps
 * @param {import("../types.js").Config} config
 */
export function resolveSteps(flowSteps, config) {
  return flowSteps.map((step) => {
    if (typeof step === "string") {
      const ref = config.steps?.[step];
      if (!ref) throw new Error(`Unknown step reference: "${step}"`);
      return ref;
    }
    return step;
  });
}

/**
 * True if at least one step is reachable with empty results — i.e. the wizard
 * would render something rather than immediately completing.
 */
export function hasActiveStep(steps, config) {
  return steps.some((s) => !s.when || s.when({}, config));
}

/**
 * The option-step entries (`[key, step]`) that should be offered as overrides.
 * Returns `[]` when there are no option steps or `flowOverrides === false`. An
 * object `flowOverrides` disables a key when its value is exactly `false`.
 *
 * @param {Record<string, object> | undefined} optionSteps
 * @param {boolean | Record<string, boolean> | undefined} flowOverrides
 */
export function overrideEntries(optionSteps, flowOverrides) {
  if (!optionSteps || flowOverrides === false) return [];
  return Object.entries(optionSteps).filter(([key]) => {
    if (typeof flowOverrides === "object" && flowOverrides !== null) {
      return flowOverrides[key] !== false;
    }
    return true;
  });
}
