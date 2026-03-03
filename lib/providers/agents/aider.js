/**
 * Creates an Aider agent provider.
 * @param {{ bin?: string, args?: string[] }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createAiderAgent(opts = {}) {
  const { bin = "aider", args = [] } = opts;
  const shellQuote = (a) => "'" + a.replace(/'/g, "'\\''") + "'";
  const argsStr = args.length ? " " + args.map(shellQuote).join(" ") : "";

  return {
    name: "aider",
    args,
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin}${argsStr} --message "$PROMPT"`,
  };
}
