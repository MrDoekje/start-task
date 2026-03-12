/** @type {import("../../types.js").SetupStep} */
export const copyEnvFiles = {
  action: "copy",
  pattern: ".env*",
  excludePattern: ".env*.example",
  description: "env files",
};

/** @type {import("../../types.js").SetupStep} */
export const symlinkNodeModules = {
  action: "symlink",
  pattern: "node_modules",
  description: "node_modules",
};

/** @type {import("../../types.js").SetupStep} */
export const copyNpmrc = {
  action: "copy",
  pattern: ".npmrc",
  description: "npmrc",
};

/** @type {import("../../types.js").SetupStep[]} */
export const nodeSetup = [copyEnvFiles, copyNpmrc, symlinkNodeModules];
