/**
 * Creates a Claude Code agent provider.
 * @param {{ bin?: string }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createClaudeCodeAgent(opts = {}) {
  const { bin = "claude" } = opts;

  return {
    name: "claude-code",
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin} "$PROMPT"`,
  };
}
