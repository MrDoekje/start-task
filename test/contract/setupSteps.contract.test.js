/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: the declarative worktree setup steps. Each step is a plain object
 * describing a copy/symlink action; these descriptors drive worktree
 * provisioning and are consumed by `runSetupSteps`. The presets and their
 * composition order are the contract.
 */
import { describe, it, expect } from "vitest";
import { copyEnvFiles, symlinkNodeModules, copyNpmrc, nodeSetup } from "../../lib/presets/setup/node.js";
import { symlinkVenv, pythonSetup } from "../../lib/presets/setup/python.js";
import { copyDockerOverrides, dockerSetup } from "../../lib/presets/setup/docker.js";
import {
  symlinkClaudeDir, symlinkAiderDir, symlinkDocsDir, copyAgentInstructions, agentDirsSetup,
} from "../../lib/presets/setup/agent-dirs.js";

describe("node setup steps", () => {
  it("copies env files excluding examples", () => {
    expect(copyEnvFiles).toEqual({
      action: "copy", pattern: ".env*", excludePattern: ".env*.example", description: "env files",
    });
  });

  it("symlinks node_modules and copies .npmrc", () => {
    expect(symlinkNodeModules).toMatchObject({ action: "symlink", pattern: "node_modules" });
    expect(copyNpmrc).toMatchObject({ action: "copy", pattern: ".npmrc" });
  });

  it("composes nodeSetup as [env, npmrc, node_modules] in order", () => {
    expect(nodeSetup).toEqual([copyEnvFiles, copyNpmrc, symlinkNodeModules]);
  });
});

describe("python setup steps", () => {
  it("symlinks the virtualenv", () => {
    expect(symlinkVenv).toMatchObject({ action: "symlink", pattern: ".venv" });
  });

  it("composes pythonSetup as [env, venv], reusing the node env step", () => {
    expect(pythonSetup).toEqual([copyEnvFiles, symlinkVenv]);
  });
});

describe("docker setup steps", () => {
  it("copies the compose override", () => {
    expect(copyDockerOverrides).toMatchObject({ action: "copy", pattern: "docker-compose.override.yml" });
  });

  it("composes dockerSetup as [env, override]", () => {
    expect(dockerSetup).toEqual([copyEnvFiles, copyDockerOverrides]);
  });
});

describe("agent-dir setup steps", () => {
  it("symlinks agent dirs and copies instruction files", () => {
    expect(symlinkClaudeDir).toMatchObject({ action: "symlink", pattern: ".claude" });
    expect(symlinkAiderDir).toMatchObject({ action: "symlink", pattern: ".aider" });
    expect(symlinkDocsDir).toMatchObject({ action: "symlink", pattern: "docs" });
    expect(copyAgentInstructions).toMatchObject({
      action: "copy", pattern: "{CLAUDE,AGENTS,CONVENTIONS,GEMINI,OPENCODE}.md",
    });
  });

  it("composes agentDirsSetup as [docs, claude, aider, instructions] in order", () => {
    expect(agentDirsSetup).toEqual([symlinkDocsDir, symlinkClaudeDir, symlinkAiderDir, copyAgentInstructions]);
  });
});
