/**
 * Creates a Ghostty terminal provider.
 * @returns {import("../../types.js").TerminalProvider}
 */
export function createGhosttyTerminal() {
  return {
    name: "ghostty",
    openCommand: (bin, session) => `open -na Ghostty.app --args -e ${bin} attach -t ${session}`,
  };
}
