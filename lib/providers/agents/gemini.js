/**
 * Creates a Gemini CLI agent provider.
 * @param {{ bin?: string, args?: string[] }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createGeminiAgent(opts = {}) {
  const { bin = "gemini", args = [] } = opts;
  const shellQuote = (a) => "'" + a.replace(/'/g, "'\\''") + "'";
  const argsStr = args.length ? " " + args.map(shellQuote).join(" ") : "";

  return {
    name: "gemini",
    args,
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin}${argsStr} "$PROMPT"`,
  };
}
