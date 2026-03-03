import { describe, it, expect, vi } from "vitest";
import { extractOptions, resolveOptions } from "../lib/resolveOptions.js";

/**
 * loadConfig reads from a fixed path (user/start-task.config.js), so we can't
 * easily test it in isolation. Instead we extract the validation logic and test
 * the same checks that loadConfig performs on flow.options.agent.
 *
 * These tests verify the validation contract documented in loadConfig.js.
 */

function makeSessionManager() {
  return {
    launchTask: vi.fn(),
    listWindows: vi.fn(),
    closeWindow: vi.fn(),
    switchToWindow: vi.fn(),
    openWindow: vi.fn(),
    isSessionRunning: vi.fn(),
    hasAttachedClient: vi.fn(),
    ensureTuiWindow: vi.fn(),
    openTerminalAttached: vi.fn(),
  };
}

function makeAgent(overrides = {}) {
  return { name: "test-agent", buildCommand: () => "cmd", ...overrides };
}

/**
 * Replicate the flow-level validation from loadConfig.js
 * so we can test it without needing a real config file.
 */
function validateFlowOptions(name, flow) {
  if (flow.options !== undefined) {
    if (!flow.options || typeof flow.options !== "object" || Array.isArray(flow.options)) {
      throw new Error(`Flow "${name}".options must be a plain object.`);
    }

    if (flow.options.agent) {
      if (typeof flow.options.agent.name !== "string" || !flow.options.agent.name) {
        throw new Error(`Flow "${name}".options.agent must have a "name" string.`);
      }
      if (typeof flow.options.agent.buildCommand !== "function") {
        throw new Error(`Flow "${name}".options.agent must have a "buildCommand" function.`);
      }
    }
  }
}

describe("flow.options validation", () => {
  it("passes when flow has no options", () => {
    const flow = { label: "Test", steps: [], action: () => {} };
    expect(() => validateFlowOptions("test", flow)).not.toThrow();
  });

  it("passes when flow.options is an empty object", () => {
    const flow = { label: "Test", steps: [], action: () => {}, options: {} };
    expect(() => validateFlowOptions("test", flow)).not.toThrow();
  });

  it("throws when flow.options is not a plain object", () => {
    const flow = { label: "Test", steps: [], action: () => {}, options: "bad" };
    expect(() => validateFlowOptions("test", flow)).toThrow('Flow "test".options must be a plain object');
  });

  it("throws when flow.options is an array", () => {
    const flow = { label: "Test", steps: [], action: () => {}, options: [] };
    expect(() => validateFlowOptions("test", flow)).toThrow('Flow "test".options must be a plain object');
  });

  it("passes when flow.options.agent has valid name and buildCommand", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { agent: makeAgent() },
    };
    expect(() => validateFlowOptions("test", flow)).not.toThrow();
  });

  it("throws when flow.options.agent.name is missing", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { agent: { buildCommand: () => "cmd" } },
    };
    expect(() => validateFlowOptions("test", flow)).toThrow(
      'Flow "test".options.agent must have a "name" string',
    );
  });

  it("throws when flow.options.agent.name is empty string", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { agent: { name: "", buildCommand: () => "cmd" } },
    };
    expect(() => validateFlowOptions("test", flow)).toThrow(
      'Flow "test".options.agent must have a "name" string',
    );
  });

  it("throws when flow.options.agent.buildCommand is missing", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { agent: { name: "custom" } },
    };
    expect(() => validateFlowOptions("test", flow)).toThrow(
      'Flow "test".options.agent must have a "buildCommand" function',
    );
  });

  it("throws when flow.options.agent.buildCommand is not a function", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { agent: { name: "custom", buildCommand: "not-a-function" } },
    };
    expect(() => validateFlowOptions("test", flow)).toThrow(
      'Flow "test".options.agent must have a "buildCommand" function',
    );
  });

  it("includes flow name in error messages", () => {
    const flow = {
      label: "My Flow",
      steps: [],
      action: () => {},
      options: { agent: { name: 42 } },
    };
    expect(() => validateFlowOptions("my-flow", flow)).toThrow('"my-flow"');
  });

  it("passes with non-agent options (opaque keys)", () => {
    const flow = {
      label: "Test",
      steps: [],
      action: () => {},
      options: { git: { provider: "gh" }, customThing: 42 },
    };
    expect(() => validateFlowOptions("test", flow)).not.toThrow();
  });
});

describe("flow-level override merging via resolveOptions", () => {
  it("flow.options.agent replaces global agent", () => {
    const globalAgent = makeAgent({ name: "global" });
    const flowAgent = makeAgent({ name: "flow-override" });
    const config = {
      agent: globalAgent,
      sessionManager: makeSessionManager(),
      flows: {
        test: { label: "Test", steps: [], action: () => {}, options: { agent: flowAgent } },
      },
    };

    const configOptions = extractOptions(config);
    const { resolvedOptions } = resolveOptions(configOptions, config.flows.test.options);

    expect(resolvedOptions.agent).toBe(flowAgent);
    expect(resolvedOptions.agent.name).toBe("flow-override");
    // Original not mutated
    expect(config.agent).toBe(globalAgent);
  });

  it("flow.options.git replaces global git", () => {
    const globalGit = { generateBranchName: () => "global" };
    const flowGit = { generateBranchName: () => "flow" };
    const config = {
      agent: makeAgent(),
      sessionManager: makeSessionManager(),
      git: globalGit,
      flows: {
        test: { label: "Test", steps: [], action: () => {}, options: { git: flowGit } },
      },
    };

    const configOptions = extractOptions(config);
    const { resolvedOptions } = resolveOptions(configOptions, config.flows.test.options);

    expect(resolvedOptions.git).toBe(flowGit);
    expect(config.git).toBe(globalGit);
  });

  it("merged config preserves all other keys", () => {
    const config = {
      agent: makeAgent({ name: "global" }),
      sessionManager: makeSessionManager(),
      flows: {
        test: {
          label: "Test",
          steps: [],
          action: () => {},
          options: { agent: makeAgent({ name: "flow" }) },
        },
      },
      taskProvider: { fetchTicket: () => {} },
      projects: { myProject: {} },
      customKey: "preserved",
    };

    const configOptions = extractOptions(config);
    const { resolvedOptions } = resolveOptions(configOptions, config.flows.test.options);

    expect(resolvedOptions.taskProvider).toBe(config.taskProvider);
    expect(resolvedOptions.projects).toBe(config.projects);
    expect(resolvedOptions.customKey).toBe("preserved");
  });

  it("no overrides when flow has no options", () => {
    const config = {
      agent: makeAgent(),
      sessionManager: makeSessionManager(),
      flows: {
        test: { label: "Test", steps: [], action: () => {} },
      },
    };

    const configOptions = extractOptions(config);
    const { resolvedOptions } = resolveOptions(configOptions, config.flows.test.options);

    expect(resolvedOptions.agent).toBe(config.agent);
  });
});

// --- optionSteps validation ---

function validateOptionSteps(config) {
  if (config.optionSteps) {
    if (typeof config.optionSteps !== "object" || Array.isArray(config.optionSteps)) {
      throw new Error("config.optionSteps must be a plain object.");
    }
    for (const [name, step] of Object.entries(config.optionSteps)) {
      if (!step || typeof step !== "object") {
        throw new Error(`optionSteps["${name}"] must be an OptionStep object.`);
      }
      if (!step.type || !step.message) {
        throw new Error(`optionSteps["${name}"] must have "type" and "message".`);
      }
    }
  }
}

describe("optionSteps validation", () => {
  it("passes when optionSteps is not defined", () => {
    expect(() => validateOptionSteps({})).not.toThrow();
  });

  it("passes with valid optionSteps entries", () => {
    const config = {
      optionSteps: {
        agent: { type: "select", message: "Agent?", options: [] },
        git: { type: "select", message: "Git?", options: [] },
      },
    };
    expect(() => validateOptionSteps(config)).not.toThrow();
  });

  it("throws when optionSteps is not a plain object", () => {
    expect(() => validateOptionSteps({ optionSteps: "bad" })).toThrow(
      "config.optionSteps must be a plain object",
    );
  });

  it("throws when optionSteps is an array", () => {
    expect(() => validateOptionSteps({ optionSteps: [] })).toThrow(
      "config.optionSteps must be a plain object",
    );
  });

  it("throws when entry is missing type", () => {
    expect(() =>
      validateOptionSteps({ optionSteps: { agent: { message: "Agent?" } } }),
    ).toThrow('optionSteps["agent"] must have "type" and "message"');
  });

  it("throws when entry is missing message", () => {
    expect(() =>
      validateOptionSteps({ optionSteps: { agent: { type: "select" } } }),
    ).toThrow('optionSteps["agent"] must have "type" and "message"');
  });

  it("throws when entry is not an object", () => {
    expect(() =>
      validateOptionSteps({ optionSteps: { agent: "bad" } }),
    ).toThrow('optionSteps["agent"] must be an OptionStep object');
  });
});

// --- flow.overrides validation ---

function validateFlowOverrides(name, flow) {
  if (flow.overrides !== undefined) {
    if (
      typeof flow.overrides !== "boolean" &&
      (typeof flow.overrides !== "object" || flow.overrides === null || Array.isArray(flow.overrides))
    ) {
      throw new Error(
        `Flow "${name}".overrides must be a boolean or a plain object of { key: boolean }.`,
      );
    }
  }
}

describe("flow.overrides validation", () => {
  it("passes when overrides is not defined", () => {
    const flow = { label: "Test", steps: [], action: () => {} };
    expect(() => validateFlowOverrides("test", flow)).not.toThrow();
  });

  it("passes when overrides is true", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: true };
    expect(() => validateFlowOverrides("test", flow)).not.toThrow();
  });

  it("passes when overrides is false", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: false };
    expect(() => validateFlowOverrides("test", flow)).not.toThrow();
  });

  it("passes when overrides is a plain object", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: { agent: false } };
    expect(() => validateFlowOverrides("test", flow)).not.toThrow();
  });

  it("throws when overrides is a string", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: "bad" };
    expect(() => validateFlowOverrides("test", flow)).toThrow(
      'Flow "test".overrides must be a boolean or a plain object',
    );
  });

  it("throws when overrides is an array", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: [] };
    expect(() => validateFlowOverrides("test", flow)).toThrow(
      'Flow "test".overrides must be a boolean or a plain object',
    );
  });

  it("throws when overrides is null", () => {
    const flow = { label: "Test", steps: [], action: () => {}, overrides: null };
    expect(() => validateFlowOverrides("test", flow)).toThrow(
      'Flow "test".overrides must be a boolean or a plain object',
    );
  });
});
