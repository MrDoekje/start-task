/**
 * Creates an iTerm terminal provider.
 * @returns {import("../../types.js").TerminalProvider}
 */
export function createItermTerminal() {
  return {
    name: "iterm",
    openCommand: (bin, session) =>
      `osascript -e 'tell application "iTerm" to create window with default profile command "${bin} attach -t ${session}"'`,
  };
}
