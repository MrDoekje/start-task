import { describe, it, expect, vi } from "vitest";
import { buildActionUtils } from "../lib/actionUtils.js";
import { extractOptions, resolveOptions } from "../lib/resolveOptions.js";

function makeConfig(overrides = {}) {
  const defaultBuild = (f) => `default ${f}`;
  return {
    agent: { name: "test-agent", buildCommand: defaultBuild },
    sessionManager: {
      launchTask: vi.fn(),
      listWindows: vi.fn(() => []),
      closeWindow: vi.fn(),
      switchToWindow: vi.fn(),
      openWindow: vi.fn(),
      isSessionRunning: vi.fn(() => true),
      hasAttachedClient: vi.fn(() => false),
      ensureTuiWindow: vi.fn(),
      openTerminalAttached: vi.fn(),
    },
    flows: {},
    ...overrides,
  };
}

describe("buildActionUtils", () => {
  it("returns an object with all expected utility functions", () => {
    const utils = buildActionUtils(makeConfig());
    expect(typeof utils.launchTask).toBe("function");
    expect(typeof utils.listWindows).toBe("function");
    expect(typeof utils.closeWindow).toBe("function");
    expect(typeof utils.switchToWindow).toBe("function");
    expect(typeof utils.openWindow).toBe("function");
    expect(typeof utils.gitFetch).toBe("function");
    expect(typeof utils.ensureWorktree).toBe("function");
    expect(typeof utils.runSetupSteps).toBe("function");
    expect(typeof utils.validateProjectKeys).toBe("function");
    expect(typeof utils.formatError).toBe("function");
    expect(typeof utils.resolve).toBe("function");
    expect(typeof utils.expandHome).toBe("function");
  });
});

describe("launchTask", () => {
  it("uses config.agent.buildCommand by default", () => {
    const config = makeConfig();
    const utils = buildActionUtils(config);

    utils.launchTask("/work", "do stuff", "task-1");

    expect(config.sessionManager.launchTask).toHaveBeenCalledOnce();
    const [dirs, prompt, name, buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(dirs).toBe("/work");
    expect(prompt).toBe("do stuff");
    expect(name).toBe("task-1");
    expect(buildCommand).toBe(config.agent.buildCommand);
  });

  it("uses override agent when passed in options", () => {
    const config = makeConfig();
    const overrideBuild = (f) => `override ${f}`;
    const utils = buildActionUtils(config);

    utils.launchTask("/work", "do stuff", "task-1", {
      agent: { name: "other", buildCommand: overrideBuild },
    });

    const [, , , buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(buildCommand).toBe(overrideBuild);
    expect(buildCommand).not.toBe(config.agent.buildCommand);
  });

  it("falls back to config agent when options is empty object", () => {
    const config = makeConfig();
    const utils = buildActionUtils(config);

    utils.launchTask("/work", "do stuff", "task-1", {});

    const [, , , buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(buildCommand).toBe(config.agent.buildCommand);
  });

  it("falls back to config agent when options.agent has no buildCommand", () => {
    const config = makeConfig();
    const utils = buildActionUtils(config);

    utils.launchTask("/work", "do stuff", "task-1", { agent: {} });

    const [, , , buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(buildCommand).toBe(config.agent.buildCommand);
  });
});

describe("launchTask with flow-level override via resolveOptions", () => {
  it("uses flow-level agent when config is rebuilt with resolved options", () => {
    const globalBuild = (f) => `global ${f}`;
    const flowBuild = (f) => `flow ${f}`;
    const config = makeConfig({
      agent: { name: "global-agent", buildCommand: globalBuild },
    });

    // Simulate what tui.js runFlow does: resolve options then rebuild config
    const configOptions = extractOptions(config);
    const flowOptions = { agent: { name: "flow-agent", buildCommand: flowBuild } };
    const { resolvedOptions } = resolveOptions(configOptions, flowOptions);
    const effectiveConfig = { ...config, ...resolvedOptions };
    const effectiveUtils = buildActionUtils(effectiveConfig);

    effectiveUtils.launchTask("/work", "prompt", "task-1");

    const [, , , buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(buildCommand).toBe(flowBuild);
  });

  it("runtime override takes precedence over flow-level override", () => {
    const globalBuild = (f) => `global ${f}`;
    const flowBuild = (f) => `flow ${f}`;
    const runtimeBuild = (f) => `runtime ${f}`;
    const config = makeConfig({
      agent: { name: "global-agent", buildCommand: globalBuild },
    });

    // Flow-level override via resolveOptions
    const configOptions = extractOptions(config);
    const flowOptions = { agent: { name: "flow-agent", buildCommand: flowBuild } };
    const { resolvedOptions } = resolveOptions(configOptions, flowOptions);
    const effectiveConfig = { ...config, ...resolvedOptions };
    const effectiveUtils = buildActionUtils(effectiveConfig);

    // Runtime override on top
    effectiveUtils.launchTask("/work", "prompt", "task-1", {
      agent: { name: "runtime-agent", buildCommand: runtimeBuild },
    });

    const [, , , buildCommand] = config.sessionManager.launchTask.mock.calls[0];
    expect(buildCommand).toBe(runtimeBuild);
  });

  it("original config is not mutated by flow-level override", () => {
    const globalBuild = (f) => `global ${f}`;
    const config = makeConfig({
      agent: { name: "global-agent", buildCommand: globalBuild },
    });

    const configOptions = extractOptions(config);
    const flowOptions = { agent: { name: "flow-agent", buildCommand: () => "flow" } };
    const { resolvedOptions } = resolveOptions(configOptions, flowOptions);
    const effectiveConfig = { ...config, ...resolvedOptions };
    buildActionUtils(effectiveConfig);

    // Original config should still have the global agent
    expect(config.agent.name).toBe("global-agent");
    expect(config.agent.buildCommand).toBe(globalBuild);
  });
});
