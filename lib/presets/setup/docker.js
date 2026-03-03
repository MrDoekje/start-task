import { copyEnvFiles } from "./node.js";

/** @type {import("../../types.js").SetupStep} */
export const copyDockerOverrides = {
  action: "copy",
  pattern: "docker-compose.override.yml",
  description: "docker-compose override",
};

/** @type {import("../../types.js").SetupStep[]} */
export const dockerSetup = [copyEnvFiles, copyDockerOverrides];
