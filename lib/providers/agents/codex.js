/**
 * Creates a Codex agent provider.
 * @param {{ bin?: string, args?: string[] }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createCodexAgent(opts = {}) {
  const { bin = "codex", args = [] } = opts;
  const shellQuote = (a) => "'" + a.replace(/'/g, "'\\''") + "'";
  const argsStr = args.length ? " " + args.map(shellQuote).join(" ") : "";

  return {
    name: "codex",
    args,
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin}${argsStr} "$PROMPT"`,
  };
}
