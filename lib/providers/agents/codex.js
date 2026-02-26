/**
 * Creates a Codex agent provider.
 * @param {{ bin?: string }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createCodexAgent(opts = {}) {
  const { bin = "codex" } = opts;

  return {
    name: "codex",
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin} "$PROMPT"`,
  };
}
