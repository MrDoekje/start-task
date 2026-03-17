import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createClaudeCodeAnalyzer } from "../lib/providers/analytics/claude-code.js";

function makeMessage(overrides = {}) {
  return {
    type: "assistant",
    sessionId: overrides.sessionId || "sess-1",
    timestamp: overrides.timestamp || "2026-03-10T10:00:00Z",
    message: {
      model: overrides.model || "claude-sonnet-4-6",
      role: "assistant",
      content: overrides.content || [{ type: "text", text: "hello" }],
      usage: {
        input_tokens: overrides.inputTokens ?? 100,
        output_tokens: overrides.outputTokens ?? 50,
        cache_read_input_tokens: overrides.cacheRead ?? 0,
        cache_creation_input_tokens: overrides.cacheCreation ?? 0,
      },
    },
  };
}

function makeUserMessage(overrides = {}) {
  return {
    type: "user",
    sessionId: overrides.sessionId || "sess-1",
    timestamp: overrides.timestamp || "2026-03-10T09:59:00Z",
    message: { role: "user", content: overrides.content || "do something" },
    cwd: overrides.cwd || "/projects/panel",
  };
}

let toolIdCounter = 0;

function makeToolUse(name) {
  const id = `t-${name}-${++toolIdCounter}`;
  return { toolUseContent: [{ type: "tool_use", name, id, input: {} }], id };
}

function makeToolResult(toolUseId, error = false) {
  return {
    type: "user",
    sessionId: "sess-1",
    timestamp: "2026-03-10T10:00:30Z",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          ...(error ? { is_error: true } : {}),
          content: error ? "fail" : "ok",
        },
      ],
    },
  };
}

describe("createClaudeCodeAnalyzer", () => {
  let tmpDir;
  let projectsDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cc-analytics-"));
    projectsDir = join(tmpDir, "projects");
    mkdirSync(projectsDir, { recursive: true });
  });

  function writeSession(subdir, sessionId, messages) {
    const dir = join(projectsDir, subdir);
    mkdirSync(dir, { recursive: true });
    const lines = messages.map((m) => JSON.stringify(m)).join("\n") + "\n";
    writeFileSync(join(dir, `${sessionId}.jsonl`), lines);
  }

  const dateRange = { from: new Date("2026-03-01"), to: new Date("2026-03-31") };

  it("returns provider with correct name", () => {
    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    expect(analyzer.name).toBe("claude-code");
  });

  it("returns empty result when no sessions exist", async () => {
    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });
    expect(result.totals.sessions).toBe(0);
    expect(result.tools).toEqual([]);
    expect(result.projects).toEqual([]);
  });

  it("counts tokens from assistant messages", async () => {
    writeSession("test-project", "sess-1", [
      makeUserMessage(),
      makeMessage({
        inputTokens: 100,
        outputTokens: 50,
        cacheRead: 200,
        cacheCreation: 300,
      }),
      makeMessage({
        inputTokens: 200,
        outputTokens: 100,
        cacheRead: 0,
        cacheCreation: 0,
      }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.totals.tokens.input).toBe(300);
    expect(result.totals.tokens.output).toBe(150);
    expect(result.totals.tokens.cacheRead).toBe(200);
    expect(result.totals.tokens.cacheCreation).toBe(300);
  });

  it("tracks tool usage and error rates", async () => {
    const bash1 = makeToolUse("Bash");
    const bash2 = makeToolUse("Bash");
    const bash3 = makeToolUse("Bash");
    const read1 = makeToolUse("Read");
    writeSession("test-project", "sess-1", [
      makeUserMessage(),
      makeMessage({ content: bash1.toolUseContent }),
      makeToolResult(bash1.id),
      makeMessage({ content: bash2.toolUseContent }),
      makeToolResult(bash2.id),
      makeMessage({ content: bash3.toolUseContent }),
      makeToolResult(bash3.id, true),
      makeMessage({ content: read1.toolUseContent }),
      makeToolResult(read1.id),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    const bash = result.tools.find((t) => t.name === "Bash");
    expect(bash.calls).toBe(3);
    expect(bash.errors).toBe(1);
    expect(bash.errorRate).toBeCloseTo(1 / 3);

    const read = result.tools.find((t) => t.name === "Read");
    expect(read.calls).toBe(1);
    expect(read.errors).toBe(0);
  });

  it("groups sessions by project directory", async () => {
    writeSession("panel", "sess-1", [
      makeUserMessage({ cwd: "/workspace/panel" }),
      makeMessage(),
    ]);
    writeSession("starship", "sess-2", [
      makeUserMessage({ sessionId: "sess-2", cwd: "/workspace/starship" }),
      makeMessage({ sessionId: "sess-2" }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.projects).toHaveLength(2);
    expect(result.totals.sessions).toBe(2);
  });

  it("tracks model usage across sessions", async () => {
    writeSession("test", "sess-1", [
      makeUserMessage(),
      makeMessage({ model: "claude-opus-4-6" }),
      makeMessage({ model: "claude-opus-4-6" }),
    ]);
    writeSession("test", "sess-2", [
      makeUserMessage({ sessionId: "sess-2" }),
      makeMessage({ sessionId: "sess-2", model: "claude-sonnet-4-6" }),
    ]);
    writeSession("test", "sess-3", [
      makeUserMessage({ sessionId: "sess-3" }),
      makeMessage({ sessionId: "sess-3", model: "claude-opus-4-6" }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.models).toHaveLength(2);
    const opus = result.models.find((m) => m.model === "claude-opus-4-6");
    const sonnet = result.models.find((m) => m.model === "claude-sonnet-4-6");
    expect(opus.sessions).toBe(2);
    expect(opus.messages).toBe(3);
    expect(sonnet.sessions).toBe(1);
    expect(sonnet.messages).toBe(1);
    // Sorted by messages desc
    expect(result.models[0].model).toBe("claude-opus-4-6");
  });

  it("tracks subagent dispatches from Agent tool_use blocks", async () => {
    writeSession("test", "sess-1", [
      makeUserMessage(),
      makeMessage({
        content: [
          { type: "tool_use", name: "Agent", id: "a1", input: { subagent_type: "Explore", description: "find files" } },
        ],
      }),
      makeMessage({
        content: [
          { type: "tool_use", name: "Agent", id: "a2", input: { subagent_type: "Explore", description: "search code" } },
        ],
      }),
      makeMessage({
        content: [
          { type: "tool_use", name: "Agent", id: "a3", input: { subagent_type: "Plan", description: "design plan" } },
        ],
      }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.subagents).toHaveLength(2);
    const explore = result.subagents.find((s) => s.type === "Explore");
    const plan = result.subagents.find((s) => s.type === "Plan");
    expect(explore.dispatches).toBe(2);
    expect(plan.dispatches).toBe(1);
    // Sorted by dispatches desc
    expect(result.subagents[0].type).toBe("Explore");
  });

  it("tracks skill invocations from Skill tool_use blocks", async () => {
    writeSession("test", "sess-1", [
      makeUserMessage(),
      makeMessage({
        content: [
          { type: "tool_use", name: "Skill", id: "s1", input: { skill: "superpowers:brainstorming" } },
        ],
      }),
      makeMessage({
        content: [
          { type: "tool_use", name: "Skill", id: "s2", input: { skill: "superpowers:brainstorming" } },
        ],
      }),
      makeMessage({
        content: [
          { type: "tool_use", name: "Skill", id: "s3", input: { skill: "simplify" } },
        ],
      }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.skills).toHaveLength(2);
    const brainstorm = result.skills.find((s) => s.name === "superpowers:brainstorming");
    const simplify = result.skills.find((s) => s.name === "simplify");
    expect(brainstorm.invocations).toBe(2);
    expect(simplify.invocations).toBe(1);
    // Sorted by invocations desc
    expect(result.skills[0].name).toBe("superpowers:brainstorming");
  });

  it("loads and counts subagent JSONL messages", async () => {
    // Create parent session
    writeSession("test", "sess-1", [
      makeUserMessage(),
      makeMessage({
        content: [
          { type: "tool_use", name: "Agent", id: "a1", input: { subagent_type: "Explore" } },
        ],
      }),
    ]);
    // Create subagent JSONL
    const subagentDir = join(projectsDir, "test", "sess-1", "subagents");
    mkdirSync(subagentDir, { recursive: true });
    writeFileSync(
      join(subagentDir, "agent-abc123.jsonl"),
      [
        JSON.stringify(makeUserMessage({ sessionId: "agent-abc123" })),
        JSON.stringify(makeMessage({ sessionId: "agent-abc123", inputTokens: 500, outputTokens: 200 })),
      ].join("\n") + "\n",
    );

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    const explore = result.subagents.find((s) => s.type === "Explore");
    expect(explore.dispatches).toBe(1);
    // Subagent tokens should be attributed
    expect(explore.tokens.input).toBeGreaterThan(0);
    expect(explore.tokens.output).toBeGreaterThan(0);
  });

  it("filters by date range", async () => {
    writeSession("test", "sess-old", [
      makeUserMessage({ timestamp: "2026-02-01T10:00:00Z" }),
      makeMessage({ timestamp: "2026-02-01T10:01:00Z" }),
    ]);
    writeSession("test", "sess-new", [
      makeUserMessage({ sessionId: "sess-new", timestamp: "2026-03-15T10:00:00Z" }),
      makeMessage({ sessionId: "sess-new", timestamp: "2026-03-15T10:01:00Z" }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.totals.sessions).toBe(1);
  });

  it("builds daily time series", async () => {
    writeSession("test", "sess-1", [
      makeUserMessage({ timestamp: "2026-03-10T10:00:00Z" }),
      makeMessage({ timestamp: "2026-03-10T10:01:00Z" }),
    ]);
    writeSession("test", "sess-2", [
      makeUserMessage({
        sessionId: "sess-2",
        timestamp: "2026-03-12T14:00:00Z",
      }),
      makeMessage({ sessionId: "sess-2", timestamp: "2026-03-12T14:01:00Z" }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({
      dateRange: { from: new Date("2026-03-10"), to: new Date("2026-03-13") },
      groupBy: "day",
    });

    expect(result.timeSeries.length).toBeGreaterThanOrEqual(2);
    const day10 = result.timeSeries.find((d) => d.date === "2026-03-10");
    const day12 = result.timeSeries.find((d) => d.date === "2026-03-12");
    expect(day10.sessions).toBe(1);
    expect(day12.sessions).toBe(1);
  });

  it("computes health metrics", async () => {
    const bash1 = makeToolUse("Bash");
    const read1 = makeToolUse("Read");
    writeSession("test", "sess-1", [
      makeUserMessage({ timestamp: "2026-03-10T10:00:00Z" }),
      makeMessage({
        timestamp: "2026-03-10T10:05:00Z",
        content: bash1.toolUseContent,
      }),
      makeToolResult(bash1.id, true),
      makeMessage({
        timestamp: "2026-03-10T10:10:00Z",
        content: read1.toolUseContent,
      }),
      makeToolResult(read1.id),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });

    expect(result.health.toolErrorRate).toBeCloseTo(0.5);
    expect(result.health.topFailingTools[0].name).toBe("Bash");
    expect(result.health.avgMessagesPerSession).toBe(2);
  });

  it("filters by project path substring", async () => {
    writeSession("panel-project", "sess-1", [
      makeUserMessage({ cwd: "/workspace/panel" }),
      makeMessage(),
    ]);
    writeSession("starship-project", "sess-2", [
      makeUserMessage({ sessionId: "sess-2", cwd: "/workspace/starship" }),
      makeMessage({ sessionId: "sess-2" }),
    ]);

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({
      dateRange,
      groupBy: "day",
      projectFilter: ["panel"],
    });

    expect(result.totals.sessions).toBe(1);
    expect(result.projects).toHaveLength(1);
  });

  it("handles missing projects directory gracefully", async () => {
    const analyzer = createClaudeCodeAnalyzer({
      claudeDir: join(tmpDir, "nonexistent"),
    });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });
    expect(result.totals.sessions).toBe(0);
  });

  it("skips malformed JSONL lines", async () => {
    const dir = join(projectsDir, "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "sess-1.jsonl"),
      [
        JSON.stringify(makeUserMessage()),
        "not valid json{{{",
        JSON.stringify(makeMessage()),
      ].join("\n"),
    );

    const analyzer = createClaudeCodeAnalyzer({ claudeDir: tmpDir });
    const result = await analyzer.analyze({ dateRange, groupBy: "day" });
    expect(result.totals.sessions).toBe(1);
    expect(result.totals.messages).toBe(1);
  });
});
