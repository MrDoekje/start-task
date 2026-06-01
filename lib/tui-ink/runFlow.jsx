import React from "react";
import { extractOptions, resolveOptions } from "../resolveOptions.js";
import { buildActionUtils } from "../actionUtils.js";
import Wizard from "./Wizard.jsx";
import { resolveStepOptions } from "./stepHelpers.js";

/**
 * Resolve string step references against config.steps; pass inline step objects through.
 */
function resolveSteps(flowSteps, config) {
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
 * Returns true if at least one step is reachable with empty results, i.e. the
 * wizard would render something rather than immediately completing.
 */
function hasActiveStep(steps, config) {
  return steps.some((s) => !s.when || s.when({}, config));
}

/**
 * Post-wizard "override defaults?" multiselect, then a prompt per selected option.
 */
async function collectOptionOverrides(optionSteps, flowOverrides, config, utils, renderScreen) {
  if (!optionSteps || flowOverrides === false) return {};

  const entries = Object.entries(optionSteps).filter(([key]) => {
    if (typeof flowOverrides === "object" && flowOverrides !== null) {
      return flowOverrides[key] !== false;
    }
    return true;
  });
  if (entries.length === 0) return {};

  const multiSelectStep = {
    type: "multiselect",
    key: "__overrides",
    message: "Override defaults? (enter to skip)",
    required: false,
    options: entries.map(([key, step]) => {
      const currentValue = config[key];
      const match = step.options ? resolveStepOptions(step, config).find((o) => o.value === currentValue) : null;
      return {
        value: key,
        label: step.label || key,
        hint: match?.label ? `current: ${match.label}` : undefined,
      };
    }),
  };

  const initial = await renderScreen((onResult) => (
    <Wizard
      steps={[multiSelectStep]}
      config={config}
      utils={utils}
      title="overrides"
      onComplete={onResult}
      onCancel={() => onResult(null)}
    />
  ));

  if (!initial) return {};
  const selectedKeys = initial.__overrides ?? [];
  if (selectedKeys.length === 0) return {};

  const result = {};
  for (const key of selectedKeys) {
    const step = { ...optionSteps[key], key };
    const sub = await renderScreen((onResult) => (
      <Wizard
        steps={[step]}
        config={config}
        utils={utils}
        title={`override · ${step.label || key}`}
        onComplete={onResult}
        onCancel={() => onResult(null)}
      />
    ));
    if (sub && sub[key] !== undefined) result[key] = sub[key];
  }
  return result;
}

/**
 * runFlow drives the option cascade and renders each prompt as an Ink screen
 * via the provided `renderScreen` helper.
 *
 * @returns {Promise<boolean>} true if the action ran; false if cancelled mid-wizard.
 */
export async function runFlow(flow, config, runtimeOptions, renderScreen) {
  const configOptions = extractOptions(config);
  const overrides = { ...flow.options, ...runtimeOptions };
  const { resolvedOptions: preOptions } = resolveOptions(configOptions, overrides);
  const preWizardConfig = { ...config, ...preOptions };
  const preWizardUtils = buildActionUtils(preWizardConfig);

  const resolvedSteps = resolveSteps(flow.steps, preWizardConfig);

  let rawResults = {};
  if (resolvedSteps.length > 0 && hasActiveStep(resolvedSteps, preWizardConfig)) {
    rawResults = await renderScreen((onResult) => (
      <Wizard
        steps={resolvedSteps}
        config={preWizardConfig}
        utils={preWizardUtils}
        title={flow.label.toLowerCase()}
        onComplete={onResult}
        onCancel={() => onResult(null)}
      />
    ));
    if (!rawResults) return false;
  }

  const optionOverrides = await collectOptionOverrides(
    config.optionSteps,
    flow.overrides,
    preWizardConfig,
    preWizardUtils,
    renderScreen,
  );

  const { resolvedOptions, results } = resolveOptions(
    configOptions,
    overrides,
    { ...rawResults, ...optionOverrides },
  );
  const effectiveConfig = { ...config, ...resolvedOptions };
  const effectiveUtils = buildActionUtils(effectiveConfig);

  process.stdout.write(`\n▶ running ${flow.label.toLowerCase()}...\n`);
  try {
    await flow.action(results, effectiveConfig, effectiveUtils);
    process.stdout.write(`✓ ${flow.label.toLowerCase()} complete\n\n`);
    return true;
  } catch (err) {
    process.stdout.write(`✕ ${flow.label.toLowerCase()} failed\n\n`);
    throw err;
  }
}
