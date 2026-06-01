/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: the single-line text editor. Each operation is a pure function over
 * `{ value, col }`. These are the exact readline-style edits any UI rendering a
 * one-line input must reproduce. Newlines are never allowed in the value.
 */
import { describe, it, expect } from "vitest";
import {
  clampCol, charLeft, charRight, wordLeft, wordRight, lineStart, lineEnd,
  deleteWordBack, deleteWordForward, killToStart, killToEnd, backspace, insert,
} from "../../lib/tui-ink/singleLineBuffer.js";

describe("clampCol", () => {
  it("clamps into [0, value.length]", () => {
    expect(clampCol("abc", 9)).toBe(3);
    expect(clampCol("abc", -2)).toBe(0);
    expect(clampCol("abc", 2)).toBe(2);
  });
});

describe("cursor movement", () => {
  it("charLeft stops at column 0", () => {
    expect(charLeft("hello", 3)).toEqual({ value: "hello", col: 2 });
    expect(charLeft("hello", 0)).toEqual({ value: "hello", col: 0 });
  });

  it("charRight stops at the end", () => {
    expect(charRight("hi", 0)).toEqual({ value: "hi", col: 1 });
    expect(charRight("hi", 2)).toEqual({ value: "hi", col: 2 });
  });

  it("wordLeft jumps to the start of the previous word", () => {
    expect(wordLeft("hello world", 11)).toEqual({ value: "hello world", col: 6 });
  });

  it("wordRight jumps past the end of the next word", () => {
    expect(wordRight("hello world", 0)).toEqual({ value: "hello world", col: 5 });
  });

  it("lineStart / lineEnd jump to the extremes", () => {
    expect(lineStart("abc")).toEqual({ value: "abc", col: 0 });
    expect(lineEnd("abc")).toEqual({ value: "abc", col: 3 });
  });

  it("clamps an out-of-range incoming column before moving", () => {
    expect(charRight("ab", 9)).toEqual({ value: "ab", col: 2 });
  });
});

describe("deletion", () => {
  it("deleteWordBack removes the word before the caret", () => {
    expect(deleteWordBack("foo bar", 7)).toEqual({ value: "foo ", col: 4 });
  });

  it("deleteWordForward removes the word after the caret", () => {
    expect(deleteWordForward("foo bar", 0)).toEqual({ value: " bar", col: 0 });
  });

  it("killToStart deletes from the caret to column 0", () => {
    expect(killToStart("hello", 3)).toEqual({ value: "lo", col: 0 });
  });

  it("killToEnd deletes from the caret to the end", () => {
    expect(killToEnd("hello", 3)).toEqual({ value: "hel", col: 3 });
  });

  it("backspace removes the char before the caret", () => {
    expect(backspace("hello", 3)).toEqual({ value: "helo", col: 2 });
  });

  it("backspace is a no-op at column 0", () => {
    expect(backspace("hello", 0)).toEqual({ value: "hello", col: 0 });
  });
});

describe("insert", () => {
  it("inserts text at the caret and advances the column", () => {
    expect(insert("ab", 1, "X")).toEqual({ value: "aXb", col: 2 });
  });

  it("strips newlines from inserted text", () => {
    expect(insert("ab", 1, "x\ny")).toEqual({ value: "axyb", col: 3 });
  });

  it("is a no-op when the input is only newlines", () => {
    expect(insert("ab", 1, "\n")).toEqual({ value: "ab", col: 1 });
    expect(insert("ab", 1, "\r\n")).toEqual({ value: "ab", col: 1 });
  });
});
