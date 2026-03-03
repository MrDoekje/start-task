/** @type {import("../../types.js").SetupStep} */
export const symlinkClaudeDir = {
  action: "symlink",
  pattern: ".claude",
  description: ".claude directory",
};

/** @type {import("../../types.js").SetupStep} */
export const symlinkAiderDir = {
  action: "symlink",
  pattern: ".aider",
  description: ".aider directory",
};

/** @type {import("../../types.js").SetupStep} */
export const symlinkDocsDir = {
  action: "symlink",
  pattern: "docs",
  description: "docs directory",
};

/** @type {import("../../types.js").SetupStep} */
export const copyAgentInstructions = {
  action: "copy",
  pattern: "{CLAUDE,AGENTS,CONVENTIONS,GEMINI,OPENCODE}.md",
  description: "agent instruction files",
};

export const agentDirsSetup = [
  symlinkDocsDir,
  symlinkClaudeDir,
  symlinkAiderDir,
  copyAgentInstructions,
];
