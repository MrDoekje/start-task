/**
 * Creates an Aider agent provider.
 * @param {{ bin?: string }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createAiderAgent(opts = {}) {
  const { bin = "aider" } = opts;

  return {
    name: "aider",
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin} --message "$PROMPT"`,
  };
}
