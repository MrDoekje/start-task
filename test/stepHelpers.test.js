import { describe, it, expect } from "vitest";
import { runStepPipeline, resolveStepOptions } from "../lib/tui-ink/stepHelpers.js";

describe("runStepPipeline", () => {
  it("returns the trimmed value when no hooks are set", () => {
    expect(runStepPipeline("  hi  ", {}, {}, {})).toEqual({ value: "hi" });
  });

  it("falls back to raw when trimmed would be empty (preserves whitespace-only strings unless optional)", () => {
    expect(runStepPipeline("   ", {}, {}, {})).toEqual({ value: "   " });
  });

  it("returns validate's error verbatim", () => {
    const step = { validate: (v) => v === "" ? "required" : undefined };
    expect(runStepPipeline("", step, {}, {})).toEqual({ error: "required" });
  });

  it("does not run transform/postValidate when validate fails", () => {
    let transformed = false;
    const step = {
      validate: () => "nope",
      transform: () => { transformed = true; return "x"; },
    };
    expect(runStepPipeline("anything", step, {}, {})).toEqual({ error: "nope" });
    expect(transformed).toBe(false);
  });

  it("short-circuits to undefined when optional and trimmed is empty", () => {
    const step = { optional: true };
    expect(runStepPipeline("   ", step, {}, {})).toEqual({ value: undefined });
    expect(runStepPipeline("", step, {}, {})).toEqual({ value: undefined });
  });

  it("optional short-circuit happens AFTER validate so required-style errors still fire", () => {
    const step = { optional: true, validate: () => "still required" };
    expect(runStepPipeline("", step, {}, {})).toEqual({ error: "still required" });
  });

  it("applies transform on the raw value and passes utils + config", () => {
    const utils = { tag: "U" };
    const config = { tag: "C" };
    const step = {
      transform: (raw, u, c) => `${raw.trim()}|${u.tag}|${c.tag}`,
    };
    expect(runStepPipeline("hi  ", step, utils, config)).toEqual({ value: "hi|U|C" });
  });

  it("postValidate runs on the transformed value", () => {
    const step = {
      transform: (raw) => raw.toUpperCase(),
      postValidate: (v) => v === "BAD" ? "no" : undefined,
    };
    expect(runStepPipeline("bad", step, {}, {})).toEqual({ error: "no" });
    expect(runStepPipeline("ok", step, {}, {})).toEqual({ value: "OK" });
  });

  it("handles null/undefined raw without throwing", () => {
    expect(runStepPipeline(undefined, {}, {}, {})).toEqual({ value: undefined });
    expect(runStepPipeline(null, {}, {}, {})).toEqual({ value: null });
  });
});

describe("resolveStepOptions", () => {
  it("returns the array directly when options is an array", () => {
    const opts = [{ value: "a", label: "A" }];
    expect(resolveStepOptions({ options: opts }, {})).toBe(opts);
  });

  it("calls options(config) when it's a function", () => {
    const step = { options: (c) => [{ value: c.tag, label: c.tag }] };
    expect(resolveStepOptions(step, { tag: "X" })).toEqual([{ value: "X", label: "X" }]);
  });
});
