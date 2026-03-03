import { describe, it, expect } from "vitest";
import { createClaudeCodeAgent } from "../lib/providers/agents/claude-code.js";
import { createCodexAgent } from "../lib/providers/agents/codex.js";
import { createAiderAgent } from "../lib/providers/agents/aider.js";
import { createGeminiAgent } from "../lib/providers/agents/gemini.js";
import { createOpenCodeAgent } from "../lib/providers/agents/opencode.js";

const factories = [
  { name: "claude-code", create: createClaudeCodeAgent, bin: "claude" },
  { name: "codex", create: createCodexAgent, bin: "codex" },
  { name: "aider", create: createAiderAgent, bin: "aider" },
  { name: "gemini", create: createGeminiAgent, bin: "gemini" },
  { name: "opencode", create: createOpenCodeAgent, bin: "opencode" },
];

for (const { name, create, bin } of factories) {
  describe(`create${name.replace(/(^|-)\w/g, (m) => m.replace("-", "").toUpperCase())}Agent`, () => {
    it("returns provider with correct name and buildCommand", () => {
      const agent = create();
      expect(agent.name).toBe(name);
      expect(typeof agent.buildCommand).toBe("function");
    });

    it("defaults args to empty array", () => {
      const agent = create();
      expect(agent.args).toEqual([]);
    });

    it("command contains the binary name", () => {
      const cmd = create().buildCommand("/tmp/prompt.txt");
      expect(cmd).toContain(bin);
    });

    it("command does not include extra args when args is empty", () => {
      const cmd = create().buildCommand("/tmp/prompt.txt");
      // The binary should be followed directly by a space and either the prompt or a flag
      // No double-space after the binary
      expect(cmd).not.toMatch(new RegExp(`${bin}  `));
    });

    it("accepts custom bin", () => {
      const agent = create({ bin: "/usr/local/bin/my-agent" });
      const cmd = agent.buildCommand("/tmp/prompt.txt");
      expect(cmd).toContain("/usr/local/bin/my-agent");
      expect(cmd).not.toContain(bin + " ");
    });

    it("inserts args into the command before the prompt", () => {
      const agent = create({ args: ["--model", "opus"] });
      expect(agent.args).toEqual(["--model", "opus"]);
      const cmd = agent.buildCommand("/tmp/prompt.txt");
      expect(cmd).toContain("--model");
      expect(cmd).toContain("opus");
      // Args should appear after the binary and before $PROMPT
      const binIdx = cmd.indexOf(bin);
      const argsIdx = cmd.indexOf("--model");
      const promptIdx = cmd.indexOf("$PROMPT");
      expect(argsIdx).toBeGreaterThan(binIdx);
      expect(promptIdx).toBeGreaterThan(argsIdx);
    });

    it("shell-quotes args with spaces", () => {
      const agent = create({ args: ["--config", "/path with spaces/file"] });
      const cmd = agent.buildCommand("/tmp/prompt.txt");
      // The arg should be single-quoted
      expect(cmd).toContain("'/path with spaces/file'");
    });

    it("shell-quotes args containing single quotes", () => {
      const agent = create({ args: ["--msg", "it's fine"] });
      const cmd = agent.buildCommand("/tmp/prompt.txt");
      // Single quotes inside should be escaped as '\''
      expect(cmd).toContain("'it'\\''s fine'");
    });

    it("handles multiple args", () => {
      const agent = create({ args: ["-v", "--model", "opus", "--timeout", "30"] });
      expect(agent.args).toHaveLength(5);
      const cmd = agent.buildCommand("/tmp/prompt.txt");
      expect(cmd).toContain("-v");
      expect(cmd).toContain("--timeout");
    });
  });
}

// Agent-specific command shape tests

describe("aider agent command shape", () => {
  it("places --message flag after args", () => {
    const cmd = createAiderAgent({ args: ["--model", "gpt-4"] }).buildCommand("/tmp/p.txt");
    const argsIdx = cmd.indexOf("--model");
    const messageIdx = cmd.indexOf("--message");
    expect(messageIdx).toBeGreaterThan(argsIdx);
  });
});

describe("opencode agent command shape", () => {
  it("places --prompt flag after args", () => {
    const cmd = createOpenCodeAgent({ args: ["--verbose"] }).buildCommand("/tmp/p.txt");
    const argsIdx = cmd.indexOf("--verbose");
    const promptFlagIdx = cmd.indexOf("--prompt");
    expect(promptFlagIdx).toBeGreaterThan(argsIdx);
  });
});
