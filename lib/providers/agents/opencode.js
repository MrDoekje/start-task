/**
 * Creates an OpenCode agent provider.
 * @param {{ bin?: string }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createOpenCodeAgent(opts = {}) {
  const { bin = "opencode" } = opts;

  return {
    name: "opencode",
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin} --prompt "$PROMPT"`,
  };
}
