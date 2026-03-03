import { describe, it, expect } from "vitest";
import { extractOptions, resolveOptions } from "../lib/resolveOptions.js";

describe("extractOptions", () => {
  it("strips framework keys (sessionManager, flows, steps, optionSteps)", () => {
    const config = {
      agent: { name: "test" },
      sessionManager: {},
      flows: {},
      steps: {},
      optionSteps: { agent: { type: "select", message: "Agent?" } },
      git: { provider: "gitlab" },
      projects: { app: {} },
    };
    const options = extractOptions(config);
    expect(options).toEqual({
      agent: { name: "test" },
      git: { provider: "gitlab" },
      projects: { app: {} },
    });
    expect(options).not.toHaveProperty("sessionManager");
    expect(options).not.toHaveProperty("flows");
    expect(options).not.toHaveProperty("steps");
    expect(options).not.toHaveProperty("optionSteps");
  });

  it("preserves arbitrary user-defined keys", () => {
    const config = {
      sessionManager: {},
      flows: {},
      customThing: 42,
      anotherOption: "hello",
    };
    const options = extractOptions(config);
    expect(options).toEqual({ customThing: 42, anotherOption: "hello" });
  });

  it("returns empty object when config only has framework keys", () => {
    const config = { sessionManager: {}, flows: {}, steps: {} };
    expect(extractOptions(config)).toEqual({});
  });
});

describe("resolveOptions", () => {
  it("config-only: returns options unchanged and empty results", () => {
    const configOptions = { agent: { name: "claude" }, git: { provider: "gl" } };
    const { resolvedOptions, results } = resolveOptions(configOptions);
    expect(resolvedOptions).toEqual(configOptions);
    expect(results).toEqual({});
  });

  it("flow overrides matching config keys", () => {
    const configOptions = { agent: { name: "claude" }, projects: { app: {} } };
    const flowOptions = { agent: { name: "gemini" } };
    const { resolvedOptions, results } = resolveOptions(configOptions, flowOptions);
    expect(resolvedOptions.agent).toEqual({ name: "gemini" });
    expect(resolvedOptions.projects).toEqual({ app: {} });
    expect(results).toEqual({});
  });

  it("flow can add new option keys not in config", () => {
    const configOptions = { agent: { name: "claude" } };
    const flowOptions = { git: { provider: "gh" } };
    const { resolvedOptions } = resolveOptions(configOptions, flowOptions);
    expect(resolvedOptions.agent).toEqual({ name: "claude" });
    expect(resolvedOptions.git).toEqual({ provider: "gh" });
  });

  it("wizard result matching option key is promoted and removed from results", () => {
    const configOptions = { agent: { name: "claude" }, projects: { app: {} } };
    const wizardResults = { agent: { name: "aider" }, instruction: "do stuff" };
    const { resolvedOptions, results } = resolveOptions(configOptions, undefined, wizardResults);
    expect(resolvedOptions.agent).toEqual({ name: "aider" });
    expect(results).toEqual({ instruction: "do stuff" });
    expect(results).not.toHaveProperty("agent");
  });

  it("wizard result not matching any option key stays in results", () => {
    const configOptions = { agent: { name: "claude" } };
    const wizardResults = { ticketKey: "PROJ-123", instruction: "fix bug" };
    const { resolvedOptions, results } = resolveOptions(configOptions, undefined, wizardResults);
    expect(resolvedOptions.agent).toEqual({ name: "claude" });
    expect(results).toEqual({ ticketKey: "PROJ-123", instruction: "fix bug" });
  });

  it("full 3-layer integration: wizard > flow > config", () => {
    const configOptions = { agent: { name: "claude" }, git: { provider: "gl" } };
    const flowOptions = { agent: { name: "gemini" } };
    const wizardResults = { agent: { name: "aider" }, ticketKey: "T-1" };
    const { resolvedOptions, results } = resolveOptions(configOptions, flowOptions, wizardResults);
    // wizard wins over flow
    expect(resolvedOptions.agent).toEqual({ name: "aider" });
    // flow didn't override git, config preserved
    expect(resolvedOptions.git).toEqual({ provider: "gl" });
    // non-option wizard result stays in results
    expect(results).toEqual({ ticketKey: "T-1" });
  });

  it("wizard key matching a flow-added option is still promoted", () => {
    const configOptions = { agent: { name: "claude" } };
    const flowOptions = { customFlag: "default" };
    const wizardResults = { customFlag: "user-choice", note: "hello" };
    const { resolvedOptions, results } = resolveOptions(configOptions, flowOptions, wizardResults);
    expect(resolvedOptions.customFlag).toBe("user-choice");
    expect(results).toEqual({ note: "hello" });
  });

  it("does not mutate input objects", () => {
    const configOptions = { agent: { name: "claude" } };
    const flowOptions = { agent: { name: "gemini" } };
    const wizardResults = { agent: { name: "aider" }, key: "val" };
    const configCopy = { ...configOptions };
    const flowCopy = { ...flowOptions };
    const wizardCopy = { ...wizardResults };

    resolveOptions(configOptions, flowOptions, wizardResults);

    expect(configOptions).toEqual(configCopy);
    expect(flowOptions).toEqual(flowCopy);
    expect(wizardResults).toEqual(wizardCopy);
  });
});
