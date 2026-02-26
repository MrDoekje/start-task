import { describe, it, expect } from "vitest";
import { validateProjectKeys, formatError } from "../lib/validation.js";

describe("validateProjectKeys", () => {
  const validKeys = ["frontend", "backend", "shared-lib"];

  it("does not throw for valid keys", () => {
    expect(() => validateProjectKeys(["frontend", "backend"], validKeys)).not.toThrow();
  });

  it("throws for invalid keys", () => {
    expect(() => validateProjectKeys(["panel", "unknown"], validKeys)).toThrow("Unknown project");
  });

  it("lists invalid keys in error message", () => {
    expect(() => validateProjectKeys(["foo", "bar"], validKeys)).toThrow("foo, bar");
  });
});

describe("formatError", () => {
  it("includes error message", () => {
    const output = formatError(new Error("something broke"));
    expect(output).toContain("something broke");
    expect(output).toContain("START-TASK FAILED");
  });

  it("includes HTTP status for API errors", () => {
    const err = new Error("Request failed");
    err.response = {
      status: 404,
      statusText: "Not Found",
      config: { method: "get", url: "/api/test" },
      data: "not found",
    };
    const output = formatError(err);
    expect(output).toContain("404");
    expect(output).toContain("Not Found");
    expect(output).toContain("GET /api/test");
  });

  it("handles error without stack", () => {
    const output = formatError({ message: "plain error" });
    expect(output).toContain("plain error");
  });
});
