/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: each terminal provider exposes a `name` and an `openCommand(bin,
 * session)` that builds the shell command to open a new terminal window
 * attached to the given session. The command strings are part of the contract.
 */
import { describe, it, expect } from "vitest";
import { createGhosttyTerminal } from "../../lib/providers/terminals/ghostty.js";
import { createItermTerminal } from "../../lib/providers/terminals/iterm.js";
import { createKittyTerminal } from "../../lib/providers/terminals/kitty.js";

describe("ghostty terminal", () => {
  const t = createGhosttyTerminal();
  it("has the expected name", () => expect(t.name).toBe("ghostty"));
  it("builds the open command", () => {
    expect(t.openCommand("cmux", "work")).toBe(
      "open -na Ghostty.app --args -e cmux attach -t work",
    );
  });
});

describe("iterm terminal", () => {
  const t = createItermTerminal();
  it("has the expected name", () => expect(t.name).toBe("iterm"));
  it("builds the AppleScript open command", () => {
    expect(t.openCommand("cmux", "work")).toBe(
      `osascript -e 'tell application "iTerm" to create window with default profile command "cmux attach -t work"'`,
    );
  });
});

describe("kitty terminal", () => {
  const t = createKittyTerminal();
  it("has the expected name", () => expect(t.name).toBe("kitty"));
  it("builds the open command", () => {
    expect(t.openCommand("cmux", "work")).toBe("kitty -e cmux attach -t work");
  });
});
