/**
 * Creates an OpenCode agent provider.
 * @param {{ bin?: string, args?: string[] }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createOpenCodeAgent(opts = {}) {
  const { bin = "opencode", args = [] } = opts;
  const shellQuote = (a) => "'" + a.replace(/'/g, "'\\''") + "'";
  const argsStr = args.length ? " " + args.map(shellQuote).join(" ") : "";

  return {
    name: "opencode",
    args,
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin}${argsStr} --prompt "$PROMPT"`,
  };
}
