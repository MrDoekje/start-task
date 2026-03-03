import { copyEnvFiles } from "./node.js";

/** @type {import("../../types.js").SetupStep} */
export const symlinkVenv = {
  action: "symlink",
  pattern: ".venv",
  description: ".venv directory",
};

/** @type {import("../../types.js").SetupStep[]} */
export const pythonSetup = [copyEnvFiles, symlinkVenv];
