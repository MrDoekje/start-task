/**
 * Creates a Claude Code agent provider.
 * @param {{ bin?: string, args?: string[] }} [opts]
 * @returns {import("../../types.js").AgentProvider}
 */
export function createClaudeCodeAgent(opts = {}) {
  const { bin = "claude", args = [] } = opts;
  const shellQuote = (a) => "'" + a.replace(/'/g, "'\\''") + "'";
  const argsStr = args.length ? " " + args.map(shellQuote).join(" ") : "";

  return {
    name: "claude-code",
    args,
    buildCommand: (promptFile) =>
      `PROMPT="$(cat ${promptFile})" && rm -f ${promptFile} && ${bin}${argsStr} "$PROMPT"`,
  };
}
