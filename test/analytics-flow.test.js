import { describe, it, expect } from "vitest";
import {
  analyticsFlow,
  analyticsAction,
} from "../lib/presets/flows/analytics.js";

const emptyResult = {
  providerName: "test",
  period: { from: new Date(), to: new Date() },
  totals: {
    sessions: 0,
    messages: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    toolCalls: 0,
  },
  tools: [],
  subagents: [],
  skills: [],
  models: [],
  projects: [],
  sessions: [],
  timeSeries: [],
  health: {
    toolErrorRate: 0,
    topFailingTools: [],
    avgSessionDuration: 0,
    avgMessagesPerSession: 0,
  },
};

function makeProvider(name, result = emptyResult) {
  return {
    name,
    analyze: async () => ({ ...result, providerName: name }),
  };
}

describe("analyticsFlow", () => {
  it("exports a valid FlowConfig", () => {
    expect(analyticsFlow.label).toBe("Analytics");
    expect(Array.isArray(analyticsFlow.steps)).toBe(true);
    expect(typeof analyticsFlow.action).toBe("function");
    expect(analyticsFlow.overrides).toBe(false);
  });

  it("has required wizard steps", () => {
    const keys = analyticsFlow.steps.map((s) => s.key);
    expect(keys).toContain("timeRange");
    expect(keys).toContain("groupBy");
    expect(keys).toContain("reportSections");
  });
});

describe("analyticsAction", () => {
  it("throws when no analytics provider is configured", async () => {
    await expect(
      analyticsAction(
        { timeRange: "7", groupBy: "day", reportSections: ["tools"] },
        {},
      ),
    ).rejects.toThrow(/analytics/i);
  });

  it("accepts a single analytics provider", async () => {
    const config = { analytics: makeProvider("test") };
    await expect(
      analyticsAction(
        { timeRange: "7", groupBy: "day", reportSections: ["tools"] },
        config,
      ),
    ).resolves.toBeUndefined();
  });

  it("accepts an array of analytics providers", async () => {
    const config = {
      analytics: [makeProvider("claude-code"), makeProvider("aider")],
    };
    await expect(
      analyticsAction(
        { timeRange: "30", groupBy: "day", reportSections: ["tokens"] },
        config,
      ),
    ).resolves.toBeUndefined();
  });

  it("filters providers by agentFilter", async () => {
    let calledProviders = [];
    const track = (name) => ({
      name,
      analyze: async () => {
        calledProviders.push(name);
        return { ...emptyResult, providerName: name };
      },
    });

    const config = { analytics: [track("claude-code"), track("aider")] };
    await analyticsAction(
      {
        timeRange: "7",
        groupBy: "day",
        reportSections: ["tools"],
        agentFilter: ["claude-code"],
      },
      config,
    );

    expect(calledProviders).toEqual(["claude-code"]);
  });

  it("renders all report sections without error", async () => {
    const richResult = {
      ...emptyResult,
      totals: {
        sessions: 5,
        messages: 50,
        tokens: { input: 1000, output: 500, cacheRead: 200, cacheCreation: 100 },
        toolCalls: 30,
      },
      tools: [
        { name: "Bash", calls: 20, errors: 2, errorRate: 0.1 },
        { name: "Read", calls: 10, errors: 0, errorRate: 0 },
      ],
      subagents: [
        { type: "Explore", dispatches: 5, tokens: { input: 300, output: 150, cacheRead: 0, cacheCreation: 0 } },
        { type: "Plan", dispatches: 2, tokens: { input: 100, output: 50, cacheRead: 0, cacheCreation: 0 } },
      ],
      skills: [
        { name: "superpowers:brainstorming", invocations: 4 },
        { name: "simplify", invocations: 2 },
      ],
      models: [
        {
          model: "claude-sonnet-4-6",
          sessions: 3,
          messages: 30,
          tokens: { input: 600, output: 300, cacheRead: 100, cacheCreation: 50 },
        },
        {
          model: "claude-opus-4-6",
          sessions: 2,
          messages: 20,
          tokens: { input: 400, output: 200, cacheRead: 100, cacheCreation: 50 },
        },
      ],
      projects: [
        {
          path: "panel",
          sessions: 3,
          messages: 30,
          tokens: { input: 600, output: 300, cacheRead: 100, cacheCreation: 50 },
        },
      ],
      sessions: [
        {
          id: "s1",
          project: "panel",
          startedAt: new Date(),
          duration: 15,
          messages: 10,
          tokens: { input: 200, output: 100, cacheRead: 0, cacheCreation: 0 },
          model: "claude-sonnet-4-6",
          topTools: ["Bash", "Read"],
        },
      ],
      timeSeries: [
        {
          date: "2026-03-10",
          sessions: 2,
          messages: 20,
          tokens: { input: 500, output: 250, cacheRead: 100, cacheCreation: 50 },
          toolCalls: 15,
        },
        {
          date: "2026-03-11",
          sessions: 3,
          messages: 30,
          tokens: { input: 500, output: 250, cacheRead: 100, cacheCreation: 50 },
          toolCalls: 15,
        },
      ],
      health: {
        toolErrorRate: 0.067,
        topFailingTools: [{ name: "Bash", errors: 2, total: 20 }],
        avgSessionDuration: 15,
        avgMessagesPerSession: 10,
      },
    };

    const config = { analytics: makeProvider("test", richResult) };
    await expect(
      analyticsAction(
        {
          timeRange: "7",
          groupBy: "day",
          reportSections: [
            "tools",
            "subagents",
            "skills",
            "models",
            "sessions",
            "projects",
            "tokens",
            "health",
          ],
        },
        config,
      ),
    ).resolves.toBeUndefined();
  });
});
