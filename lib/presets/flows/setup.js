import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../..");

/** @type {import("../../types.js").WizardStep} */
export const setupStep = {
  type: "text",
  key: "instruction",
  message: "What do you want to change?",
  placeholder: "Add a new project, switch provider, add a flow...",
  validate(value) {
    if (!value?.trim()) return "Describe what you want to change.";
  },
};

/**
 * @param {Record<string, unknown>} results
 * @param {import("../../types.js").Config} _config
 * @param {import("../../types.js").ActionUtils} utils
 */
export async function setupAction(results, _config, utils) {
  const prompt = `You are modifying the start-task tool configuration.

## User Request
${results.instruction.trim()}

## Instructions
- The config file is at: ${utils.resolve(PROJECT_ROOT, "user", "start-task.config.js")}
- Read the config file first to understand the current state
- Read CLAUDE.md in the project root for the config shape and available options
- Make the requested changes, then verify with \`npm test\` and \`npm run lint\`
- Keep changes minimal and focused on what was requested`;

  utils.launchTask(PROJECT_ROOT, prompt, "setup");
  console.log("Setup agent launched.");
}

/** @type {import("../../types.js").FlowConfig} */
export const setupFlow = {
  label: "Setup",
  steps: [setupStep],
  action: setupAction,
};
