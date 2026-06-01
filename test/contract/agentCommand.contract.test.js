/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: every agent provider builds a shell command that reads the prompt
 * from a temp file, deletes that file, then runs the agent binary with the
 * prompt. Args are single-quote-escaped and placed before the prompt. These
 * invariants hold across all agents regardless of which one a flow uses.
 */
import { describe, it, expect } from "vitest";
import { createClaudeCodeAgent } from "../../lib/providers/agents/claude-code.js";
import { createCodexAgent } from "../../lib/providers/agents/codex.js";
import { createGeminiAgent } from "../../lib/providers/agents/gemini.js";
import { createAiderAgent } from "../../lib/providers/agents/aider.js";
import { createOpenCodeAgent } from "../../lib/providers/agents/opencode.js";

const AGENTS = [
  ["claude-code", createClaudeCodeAgent],
  ["codex", createCodexAgent],
  ["gemini", createGeminiAgent],
  ["aider", createAiderAgent],
  ["opencode", createOpenCodeAgent],
];

describe.each(AGENTS)("%s agent", (name, make) => {
  it("reports its name and defaults args to []", () => {
    const a = make();
    expect(a.name).toBe(name);
    expect(a.args).toEqual([]);
  });

  it("reads then removes the prompt file and runs the bin with the prompt", () => {
    const cmd = make({ bin: "BIN" }).buildCommand("/tmp/p.txt");
    expect(cmd).toContain("cat /tmp/p.txt");
    expect(cmd).toContain("rm -f /tmp/p.txt");
    expect(cmd).toContain("BIN");
    expect(cmd.trimEnd().endsWith('"$PROMPT"')).toBe(true);
  });

  it("single-quotes args, escapes embedded quotes, and places them before the prompt", () => {
    const cmd = make({ bin: "BIN", args: ["--model", "a b", "it's"] }).buildCommand("/tmp/p.txt");
    expect(cmd).toContain("'--model'");
    expect(cmd).toContain("'a b'");
    expect(cmd).toContain("'it'\\''s'");
    expect(cmd.indexOf("'--model'")).toBeLessThan(cmd.indexOf('"$PROMPT"'));
  });

  it("does not leave a double space when there are no args", () => {
    const cmd = make({ bin: "BIN" }).buildCommand("/tmp/p.txt");
    expect(cmd).not.toContain("BIN  ");
  });
});
