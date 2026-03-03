import * as p from "@clack/prompts";
import { loadConfig } from "./loadConfig.js";
import { buildActionUtils } from "./actionUtils.js";
import { formatError } from "./validation.js";

// --- Wizard (step-based state machine with back navigation) ---

/**
 * Runs a multi-step prompt flow. Ctrl+C at any step goes back to the previous
 * step (with its answer preserved as default). Ctrl+C at step 0 returns null.
 * @param {{ key: string, prompt: (results: Record<string, any>) => Promise<any> }[]} steps
 * @returns {Promise<Record<string, any> | null>}
 */
async function wizard(steps) {
  const results = {};
  let i = 0;
  while (i < steps.length) {
    const step = steps[i];
    const value = await step.prompt(results);
    if (p.isCancel(value)) {
      if (i === 0) return null;
      i--;
      continue;
    }
    results[step.key] = value;
    i++;
  }
  return results;
}

/**
 * Converts a config flow step into a wizard-compatible step.
 * @param {import("./types.js").WizardStep} step
 * @param {import("./types.js").Config} config
 * @param {import("./types.js").ActionUtils} utils
 * @returns {{ key: string, prompt: (results: Record<string, any>) => Promise<any> }}
 */
function buildWizardStep(step, config, utils) {
  return {
    key: step.key,
    prompt: async (results) => {
      const initialValue = results[step.key];

      if (step.type === "text") {
        const raw = await p.text({
          message: step.message,
          placeholder: step.placeholder,
          initialValue,
          validate(value) {
            if (step.validate) {
              const err = step.validate(value);
              if (err) return err;
            }
            if (step.transform && step.postValidate) {
              const transformed = step.transform(value, utils, config);
              const postErr = step.postValidate(transformed, utils, config);
              if (postErr) return postErr;
            }
          },
        });
        if (p.isCancel(raw)) return raw;

        let value = raw?.trim() || undefined;
        if (step.optional && !value) return value;
        if (step.transform) value = step.transform(raw, utils, config);
        return value;
      }

      if (step.type === "multiselect") {
        const preSet = new Set(initialValue || []);
        const options = typeof step.options === "function" ? step.options(config) : step.options;
        return p.multiselect({
          message: step.message,
          options: options.map((opt) => ({
            ...opt,
            selected: preSet.has(opt.value),
          })),
          required: step.required ?? false,
        });
      }

      if (step.type === "select") {
        const options = typeof step.options === "function" ? step.options(config) : step.options;
        return p.select({
          message: step.message,
          options,
        });
      }

      throw new Error(`Unknown step type: ${step.type}`);
    },
  };
}

/**
 * Shows active task windows with switch/close actions.
 * @param {import("./types.js").ActionUtils} utils
 * @returns {Promise<void>}
 */
async function showActiveTasks(utils) {
  const windows = utils.listWindows();
  if (windows.length === 0) {
    p.note("No active task windows.");
    return;
  }

  const choice = await p.select({
    message: `Active tasks (${windows.length}):`,
    options: [
      ...windows.map((w) => ({
        value: w.name,
        label: `${w.status === "running" ? "●" : "○"} ${w.name}`,
        hint: `${w.status}  ${w.paneCount} panes${w.active ? "  (focused)" : ""}`,
      })),
      { value: "__back", label: "Back to menu" },
    ],
  });

  if (p.isCancel(choice) || choice === "__back") return;

  const action = await p.select({
    message: `${choice}:`,
    options: [
      { value: "switch", label: "Switch to window" },
      { value: "close", label: "Close window" },
      { value: "back", label: "Back" },
    ],
  });

  if (p.isCancel(action) || action === "back") return showActiveTasks(utils);

  if (action === "switch") {
    utils.switchToWindow(choice);
  } else if (action === "close") {
    utils.closeWindow(choice);
    p.log.success(`Closed window "${choice}".`);
  }
}

/**
 * Runs a flow from config: executes wizard steps then the action function.
 * @param {import("./types.js").FlowConfig} flow
 * @param {import("./types.js").Config} config
 * @param {import("./types.js").ActionUtils} utils
 */
async function runFlow(flow, config, utils) {
  const resolvedSteps = flow.steps.map((step) => {
    if (typeof step === "string") {
      const resolved = config.steps?.[step];
      if (!resolved) throw new Error(`Unknown step reference: "${step}"`);
      return resolved;
    }
    return step;
  });
  const wizardSteps = resolvedSteps.map((step) => buildWizardStep(step, config, utils));
  const result = await wizard(wizardSteps);
  if (!result) return;

  const s = p.spinner();
  s.start(`Running ${flow.label.toLowerCase()}...`);
  try {
    await flow.action(result, config, utils);
    s.stop(`${flow.label} complete!`);
  } catch (err) {
    s.stop(`${flow.label} failed.`);
    throw err;
  }
}

// --- Main loop ---

export default async function runTui() {
  const config = await loadConfig();
  const utils = buildActionUtils(config);

  console.clear();
  p.intro("start-task TUI");

  const isFirstRun = process.env.START_TASK_FIRST_RUN === "1";
  if (isFirstRun) {
    p.note("Welcome! A setup agent will help you configure the rest.", "First-time setup");
    const { setupAction } = await import("./presets/flows/setup.js");
    await setupAction(
      {
        instruction:
          "This is a first-time setup. The minimal config has agent, terminal, and session manager. Help me set up the rest: git provider, task provider, projects, workspace root, worktree config, and custom flows. Read the config first, then guide me.",
      },
      config,
      utils,
    );
  }

  while (true) {
    const flowEntries = Object.entries(config.flows);

    const menuOptions = [
      ...flowEntries.map(([key, flow]) => ({
        value: key,
        label: flow.label,
      })),
      { value: "__active", label: "Active Tasks" },
      { value: "__quit", label: "Quit" },
    ];

    const action = await p.select({
      message: "What would you like to do?",
      options: menuOptions,
    });

    if (p.isCancel(action) || action === "__quit") break;

    try {
      if (action === "__active") {
        await showActiveTasks(utils);
        continue;
      }

      // Must be a flow key
      const flow = config.flows[action];
      if (flow) {
        await runFlow(flow, config, utils);
      }
    } catch (err) {
      p.note(formatError(err), "Error");
    }
  }

  p.outro("Goodbye!");
}

// Allow direct execution for backwards compatibility
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("/tui.js") || process.argv[1].endsWith("/lib/tui.js"));
if (isDirectRun) {
  runTui().catch((err) => {
    console.error(formatError(err));
    process.exit(1);
  });
}
