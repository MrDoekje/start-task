import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { loadEnv } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const REQUIRED_KEYS = ["agent", "sessionManager", "flows"];

const SESSION_MANAGER_METHODS = [
  "launchTask",
  "listWindows",
  "closeWindow",
  "switchToWindow",
  "openWindow",
  "isSessionRunning",
  "hasAttachedClient",
  "ensureTuiWindow",
  "openTerminalAttached",
];

/**
 * Loads and validates the user config from start-task.config.js.
 * Only validates framework-required keys (sessionManager, flows).
 * Any additional keys (git, taskProvider, projects, prompts, etc.)
 * are passed through for flow actions to use as needed.
 * @returns {Promise<import("./types.js").Config>}
 */
export async function loadConfig() {
  loadEnv();

  const configPath = resolve(PROJECT_ROOT, "user", "start-task.config.js");

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const mod = await import(configPath);
  const config = mod.default;

  if (!config || typeof config !== "object") {
    throw new Error("start-task.config.js must export a default object.");
  }

  const missing = REQUIRED_KEYS.filter((key) => !(key in config));
  if (missing.length > 0) {
    throw new Error(`Config is missing required keys: ${missing.join(", ")}`);
  }

  // Validate agent shape
  if (typeof config.agent.name !== "string" || !config.agent.name) {
    throw new Error('config.agent must have a "name" string.');
  }
  if (typeof config.agent.buildCommand !== "function") {
    throw new Error('config.agent must have a "buildCommand" function.');
  }

  // Validate sessionManager shape
  for (const method of SESSION_MANAGER_METHODS) {
    if (typeof config.sessionManager[method] !== "function") {
      throw new Error(
        `config.sessionManager must have a "${method}" function (SessionManager shape).`,
      );
    }
  }

  // Validate step definitions
  if (config.steps) {
    for (const [name, step] of Object.entries(config.steps)) {
      if (!step || typeof step !== "object") {
        throw new Error(`Step "${name}" must be a WizardStep object.`);
      }
      if (!step.type || !step.key || !step.message) {
        throw new Error(`Step "${name}" must have "type", "key", and "message".`);
      }
    }
  }

  // Validate optionSteps definitions
  if (config.optionSteps) {
    if (typeof config.optionSteps !== "object" || Array.isArray(config.optionSteps)) {
      throw new Error("config.optionSteps must be a plain object.");
    }
    for (const [name, step] of Object.entries(config.optionSteps)) {
      if (!step || typeof step !== "object") {
        throw new Error(`optionSteps["${name}"] must be an OptionStep object.`);
      }
      if (!step.type || !step.message) {
        throw new Error(`optionSteps["${name}"] must have "type" and "message".`);
      }
    }
  }

  // Validate flows have required properties and resolve step references
  for (const [name, flow] of Object.entries(config.flows)) {
    if (!flow.label) throw new Error(`Flow "${name}" is missing "label".`);
    if (!Array.isArray(flow.steps)) throw new Error(`Flow "${name}" is missing "steps" array.`);
    if (typeof flow.action !== "function")
      throw new Error(`Flow "${name}" is missing "action" function.`);

    for (const step of flow.steps) {
      if (typeof step === "string" && !config.steps?.[step]) {
        throw new Error(
          `Flow "${name}" references unknown step "${step}". Define it in config.steps.`,
        );
      }
    }

    // Validate flow.options if present
    if (flow.options !== undefined) {
      if (!flow.options || typeof flow.options !== "object" || Array.isArray(flow.options)) {
        throw new Error(`Flow "${name}".options must be a plain object.`);
      }

      // Validate agent shape if overridden at flow level
      if (flow.options.agent) {
        if (typeof flow.options.agent.name !== "string" || !flow.options.agent.name) {
          throw new Error(`Flow "${name}".options.agent must have a "name" string.`);
        }
        if (typeof flow.options.agent.buildCommand !== "function") {
          throw new Error(`Flow "${name}".options.agent must have a "buildCommand" function.`);
        }
      }
    }

    // Validate flow.overrides if present
    if (flow.overrides !== undefined) {
      if (
        typeof flow.overrides !== "boolean" &&
        (typeof flow.overrides !== "object" || flow.overrides === null || Array.isArray(flow.overrides))
      ) {
        throw new Error(
          `Flow "${name}".overrides must be a boolean or a plain object of { key: boolean }.`,
        );
      }
    }
  }

  return config;
}
