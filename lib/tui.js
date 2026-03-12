import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./loadConfig.js";
import { buildActionUtils } from "./actionUtils.js";
import { extractOptions, resolveOptions } from "./resolveOptions.js";
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

      if (step.type === "editor") {
        const dir = mkdtempSync(join(tmpdir(), "start-task-"));
        const tmpFile = join(dir, step.fileName || "input.md");
        const header = step.editorHeader ?? `# ${step.message}\n# Lines starting with # are stripped. Save and close to continue.\n\n`;
        writeFileSync(tmpFile, header + (initialValue || ""), "utf8");

        const editor = process.env.VISUAL || process.env.EDITOR || "vi";
        const editorName = editor.split("/").pop();
        p.log.info(`Opening ${editorName}... (save and close to continue)`);
        try {
          execFileSync(editor, [tmpFile], { stdio: "inherit" });
        } catch {
          try { unlinkSync(tmpFile); } catch {}
          p.log.warn("Editor failed to open. Skipping.");
          if (step.optional) return undefined;
          return initialValue;
        }

        const raw = readFileSync(tmpFile, "utf8");
        try { unlinkSync(tmpFile); } catch {}

        // Strip comment lines and trim
        const value = raw
          .split("\n")
          .filter((line) => !line.startsWith("#"))
          .join("\n")
          .trim() || undefined;

        if (step.optional && !value) return value;
        if (step.transform) return step.transform(value, utils, config);
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
 * Collects user-chosen option overrides via a multiselect + per-option wizard steps.
 * Returns an object of { optionKey: chosenValue } for selected overrides, empty if skipped.
 *
 * @param {Record<string, import("./types.js").OptionStep>} optionSteps - All available option steps
 * @param {boolean | Record<string, boolean> | undefined} flowOverrides - Flow-level override control
 * @param {import("./types.js").Config} config - Pre-wizard resolved config (for step options/hints)
 * @param {import("./types.js").ActionUtils} utils - Pre-wizard utils
 * @returns {Promise<Record<string, any>>}
 */
async function collectOptionOverrides(optionSteps, flowOverrides, config, utils) {
  if (!optionSteps || flowOverrides === false) return {};

  const entries = Object.entries(optionSteps).filter(([key]) => {
    if (typeof flowOverrides === "object" && flowOverrides !== null) {
      return flowOverrides[key] !== false;
    }
    return true;
  });

  if (entries.length === 0) return {};

  const multiOptions = entries.map(([key, step]) => {
    const currentValue = config[key];
    let hint;
    if (step.options) {
      const opts = typeof step.options === "function" ? step.options(config) : step.options;
      const match = opts.find((o) => o.value === currentValue);
      hint = match?.label;
    }
    return {
      value: key,
      label: step.label || key,
      hint: hint ? `current: ${hint}` : undefined,
    };
  });

  const selected = await p.multiselect({
    message: "Override defaults? (enter to skip)",
    options: multiOptions,
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) return {};

  const overrideResults = {};
  for (const key of selected) {
    const step = { ...optionSteps[key], key };
    const wizardStep = buildWizardStep(step, config, utils);
    const value = await wizardStep.prompt({});
    if (p.isCancel(value)) continue;
    overrideResults[key] = value;
  }

  return overrideResults;
}

/**
 * Runs a flow from config: executes wizard steps then the action function.
 *
 * Option cascade (each layer wins over the previous):
 *   config → flow.options → runtimeOptions → wizard steps → option overrides
 *
 * @param {import("./types.js").FlowConfig} flow
 * @param {import("./types.js").Config} config
 * @param {Record<string, any>} [runtimeOptions] - Per-invocation overrides
 */
export async function runFlow(flow, config, runtimeOptions) {
  const configOptions = extractOptions(config);
  const overrides = { ...flow.options, ...runtimeOptions };

  // Pre-wizard: config + overrides so wizard steps see all pre-wizard options
  const { resolvedOptions: preOptions } = resolveOptions(configOptions, overrides);
  const preWizardConfig = { ...config, ...preOptions };
  const preWizardUtils = buildActionUtils(preWizardConfig);

  const resolvedSteps = flow.steps.map((step) => {
    if (typeof step === "string") {
      const resolved = preWizardConfig.steps?.[step];
      if (!resolved) throw new Error(`Unknown step reference: "${step}"`);
      return resolved;
    }
    return step;
  });
  const wizardSteps = resolvedSteps.map((step) => buildWizardStep(step, preWizardConfig, preWizardUtils));
  const rawResults = await wizard(wizardSteps);
  if (!rawResults) return;

  // Option override wizard (after flow steps, before action)
  const optionOverrides = await collectOptionOverrides(
    config.optionSteps,
    flow.overrides,
    preWizardConfig,
    preWizardUtils,
  );

  // Post-wizard: full cascade merge (option overrides auto-promote by key match)
  const { resolvedOptions, results } = resolveOptions(
    configOptions,
    overrides,
    { ...rawResults, ...optionOverrides },
  );
  const effectiveConfig = { ...config, ...resolvedOptions };
  const effectiveUtils = buildActionUtils(effectiveConfig);

  const s = p.spinner();
  s.start(`Running ${flow.label.toLowerCase()}...`);
  try {
    await flow.action(results, effectiveConfig, effectiveUtils);
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
        instruction: `This is a first-time setup. The minimal config has agent, terminal, and session manager.

                      Before configuring anything, ask me about my workflow preferences:

                      1. **Worktrees & branches**: Should each task get its own git branch and worktree, or do I work directly in the project directory?
                      2. **Task context**: How do I want to provide task context?
                        - **Ticket provider** — I use a tracker (Jira, GitLab Issues, Linear, Notion) and want a built-in provider to fetch tickets by key/URL
                        - **MCP tool** — I already have an MCP server (or plan to add one) that can fetch tickets, so the flow action should call that tool instead of a built-in provider
                        - **Manual** — I prefer to paste task context directly
                      3. **Workflows**: Which flows do I want in the menu?
                        - Start Task — work on a task with full setup
                        - Investigate — read-only analysis of a task
                        - QA — review and test an existing implementation
                        - Quick Task — simple instruction without ticket/git overhead
                        - Custom — describe what I need

                      Ask these questions one at a time, then use the answers to:
                      - Set up the appropriate providers (git, task) — use existing ones from lib/providers/ if they match, or create new ones via /create-provider
                      - Configure worktree settings if requested
                      - Add my projects to the config
                      - Create the flow actions via /create-flow-action
                      - Wire everything together via /configure-start-task
                      - Set up any needed .env variables

                      Read the project documentation (CLAUDE.md, README.md, or equivalent) and the config file first, then start asking.`,
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
        await runFlow(flow, config);
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
