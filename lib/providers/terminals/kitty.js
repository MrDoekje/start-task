/**
 * Creates a Kitty terminal provider.
 * @returns {import("../../types.js").TerminalProvider}
 */
export function createKittyTerminal() {
  return {
    name: "kitty",
    openCommand: (bin, session) => `kitty -e ${bin} attach -t ${session}`,
  };
}
