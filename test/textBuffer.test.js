import { describe, it, expect } from "vitest";
import { prevWordBoundary, nextWordBoundary } from "../lib/tui-ink/textBuffer.js";

describe("prevWordBoundary", () => {
  it("returns 0 when at start of line", () => {
    expect(prevWordBoundary("hello world", 0)).toBe(0);
  });

  it("jumps from end of word to its start", () => {
    expect(prevWordBoundary("hello world", 11)).toBe(6);
    expect(prevWordBoundary("hello world", 5)).toBe(0);
  });

  it("skips trailing separators then the word body", () => {
    expect(prevWordBoundary("foo bar  ", 9)).toBe(4);
    expect(prevWordBoundary("foo--bar", 8)).toBe(5);
  });

  it("treats underscore as a word char", () => {
    expect(prevWordBoundary("snake_case ", 11)).toBe(0);
  });

  it("treats numbers as word chars", () => {
    expect(prevWordBoundary("abc123 xyz", 6)).toBe(0);
  });

  it("handles punctuation runs", () => {
    expect(prevWordBoundary("a.b.c", 5)).toBe(4);
    expect(prevWordBoundary("a.b.c", 4)).toBe(2);
  });

  it("returns 0 for empty line", () => {
    expect(prevWordBoundary("", 0)).toBe(0);
  });

  it("returns 0 when only separators precede the cursor", () => {
    expect(prevWordBoundary("    ", 4)).toBe(0);
  });

  it("from middle of word jumps to that word's start", () => {
    expect(prevWordBoundary("hello", 3)).toBe(0);
  });
});

describe("nextWordBoundary", () => {
  it("returns line length when at end", () => {
    expect(nextWordBoundary("hello", 5)).toBe(5);
  });

  it("jumps past end of next word", () => {
    expect(nextWordBoundary("hello world", 0)).toBe(5);
    expect(nextWordBoundary("hello world", 6)).toBe(11);
  });

  it("skips leading separators then the word body", () => {
    expect(nextWordBoundary("  hello world", 0)).toBe(7);
    expect(nextWordBoundary("foo  bar", 3)).toBe(8);
  });

  it("from middle of word jumps past current word", () => {
    expect(nextWordBoundary("hello world", 2)).toBe(5);
  });

  it("handles trailing separators with no next word", () => {
    expect(nextWordBoundary("foo   ", 3)).toBe(6);
  });

  it("treats punctuation as separators", () => {
    expect(nextWordBoundary("a.b.c", 0)).toBe(1);
    expect(nextWordBoundary("a.b.c", 1)).toBe(3);
  });

  it("returns 0 for empty line at col 0", () => {
    expect(nextWordBoundary("", 0)).toBe(0);
  });

  it("is symmetric with prevWordBoundary for round-trip", () => {
    // From "hello world" col 11 → prev → 6 → next → 11
    const line = "hello world";
    expect(nextWordBoundary(line, prevWordBoundary(line, 11))).toBe(11);
  });
});
