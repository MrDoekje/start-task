/**
 * Creates a Gemini CLI agent provider.
 * @param {{ bin?: string }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createGeminiAgent(opts = {}) {
  const { bin = "gemini" } = opts;

  return {
    name: "gemini",
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin} "$PROMPT"`,
  };
}
