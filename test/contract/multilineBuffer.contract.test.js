/**
 * ━━━ NORTH-STAR BEHAVIORAL CONTRACT — DO NOT MODIFY TO PASS A REFACTOR ━━━
 * Framework-agnostic. No UI/render imports. See test/contract/README.md.
 *
 * Contract: the multi-line text editor. State is `{ lines, row, col }` and each
 * operation is a pure transform. This pins paste handling, line joining, cursor
 * wrapping across line boundaries, and per-line word operations — the exact
 * behavior any UI rendering a multi-line input must reproduce.
 */
import { describe, it, expect } from "vitest";
import * as buf from "../../lib/tui-ink/multilineBuffer.js";

describe("initBuffer / toText / charCount", () => {
  it("seeds a single empty line from empty input", () => {
    expect(buf.initBuffer("")).toEqual({ lines: [""], row: 0, col: 0 });
    expect(buf.initBuffer(undefined)).toEqual({ lines: [""], row: 0, col: 0 });
  });

  it("seeds multi-line input with the caret at the end of the last line", () => {
    expect(buf.initBuffer("a\nbc")).toEqual({ lines: ["a", "bc"], row: 1, col: 2 });
  });

  it("round-trips through toText", () => {
    expect(buf.toText({ lines: ["a", "bc"], row: 0, col: 0 })).toBe("a\nbc");
  });

  it("counts chars including the newline between lines", () => {
    expect(buf.charCount({ lines: ["a", "bc"], row: 0, col: 0 })).toBe(4);
    expect(buf.charCount({ lines: [""], row: 0, col: 0 })).toBe(0);
  });
});

describe("insertText", () => {
  it("inserts plain text at the caret", () => {
    expect(buf.insertText({ lines: ["ab"], row: 0, col: 1 }, "X")).toEqual({
      lines: ["aXb"], row: 0, col: 2,
    });
  });

  it("splits the line on an embedded newline (paste)", () => {
    expect(buf.insertText({ lines: ["ab"], row: 0, col: 1 }, "X\nY")).toEqual({
      lines: ["aX", "Yb"], row: 1, col: 1,
    });
  });

  it("a lone newline splits the current line in two", () => {
    expect(buf.insertText({ lines: ["ab"], row: 0, col: 1 }, "\n")).toEqual({
      lines: ["a", "b"], row: 1, col: 0,
    });
  });

  it("normalizes \\r\\n and \\r as line breaks", () => {
    expect(buf.insertText({ lines: [""], row: 0, col: 0 }, "x\r\ny\rz").lines).toEqual(["x", "y", "z"]);
  });

  it("does not mutate the input state", () => {
    const state = { lines: ["ab"], row: 0, col: 1 };
    buf.insertText(state, "Z");
    expect(state).toEqual({ lines: ["ab"], row: 0, col: 1 });
  });
});

describe("backspace", () => {
  it("removes the char before the caret within a line", () => {
    expect(buf.backspace({ lines: ["hello"], row: 0, col: 3 })).toEqual({
      lines: ["helo"], row: 0, col: 2,
    });
  });

  it("joins with the previous line at column 0", () => {
    expect(buf.backspace({ lines: ["a", "b"], row: 1, col: 0 })).toEqual({
      lines: ["ab"], row: 0, col: 1,
    });
  });

  it("is a no-op at the very start of the buffer", () => {
    const state = { lines: ["abc"], row: 0, col: 0 };
    expect(buf.backspace(state)).toEqual({ lines: ["abc"], row: 0, col: 0 });
  });
});

describe("kill operations", () => {
  it("killToEol truncates the line at the caret", () => {
    expect(buf.killToEol({ lines: ["hello"], row: 0, col: 2 })).toEqual({
      lines: ["he"], row: 0, col: 2,
    });
  });

  it("killToBol drops everything before the caret and moves to column 0", () => {
    expect(buf.killToBol({ lines: ["hello"], row: 0, col: 2 })).toEqual({
      lines: ["llo"], row: 0, col: 0,
    });
  });
});

describe("cursor movement", () => {
  it("moveUp clamps the column to the target line length", () => {
    expect(buf.moveUp({ lines: ["a", "bcd"], row: 1, col: 3 })).toEqual({
      lines: ["a", "bcd"], row: 0, col: 1,
    });
  });

  it("moveUp at the top row is a no-op (same reference)", () => {
    const state = { lines: ["a", "b"], row: 0, col: 0 };
    expect(buf.moveUp(state)).toBe(state);
  });

  it("moveDown clamps the column to the target line length", () => {
    expect(buf.moveDown({ lines: ["abc", "d"], row: 0, col: 3 })).toEqual({
      lines: ["abc", "d"], row: 1, col: 1,
    });
  });

  it("moveDown at the last row is a no-op (same reference)", () => {
    const state = { lines: ["a", "b"], row: 1, col: 0 };
    expect(buf.moveDown(state)).toBe(state);
  });

  it("moveLeft wraps to the end of the previous line at column 0", () => {
    expect(buf.moveLeft({ lines: ["a", "b"], row: 1, col: 0 })).toEqual({
      lines: ["a", "b"], row: 0, col: 1,
    });
  });

  it("moveLeft at the very start is a no-op (same reference)", () => {
    const state = { lines: ["ab"], row: 0, col: 0 };
    expect(buf.moveLeft(state)).toBe(state);
  });

  it("moveRight wraps to the start of the next line at line end", () => {
    expect(buf.moveRight({ lines: ["a", "b"], row: 0, col: 1 })).toEqual({
      lines: ["a", "b"], row: 1, col: 0,
    });
  });

  it("moveRight at the very end is a no-op (same reference)", () => {
    const state = { lines: ["a", "b"], row: 1, col: 1 };
    expect(buf.moveRight(state)).toBe(state);
  });

  it("moveLineStart / moveLineEnd jump within the current line", () => {
    expect(buf.moveLineStart({ lines: ["hello"], row: 0, col: 3 }).col).toBe(0);
    expect(buf.moveLineEnd({ lines: ["hello"], row: 0, col: 1 }).col).toBe(5);
  });

  it("moveWordLeft / moveWordRight operate on the current line", () => {
    expect(buf.moveWordLeft({ lines: ["hello world"], row: 0, col: 11 }).col).toBe(6);
    expect(buf.moveWordRight({ lines: ["hello world"], row: 0, col: 0 }).col).toBe(5);
  });
});

describe("per-line word deletion", () => {
  it("deleteWordBack removes the word before the caret on the current line", () => {
    expect(buf.deleteWordBack({ lines: ["foo bar"], row: 0, col: 7 })).toEqual({
      lines: ["foo "], row: 0, col: 4,
    });
  });

  it("deleteWordBack is a no-op at a word boundary (same reference)", () => {
    const state = { lines: ["foo"], row: 0, col: 0 };
    expect(buf.deleteWordBack(state)).toBe(state);
  });

  it("deleteWordForward removes the word after the caret on the current line", () => {
    expect(buf.deleteWordForward({ lines: ["foo bar"], row: 0, col: 0 })).toEqual({
      lines: [" bar"], row: 0, col: 0,
    });
  });

  it("deleteWordForward is a no-op at a word boundary (same reference)", () => {
    const state = { lines: ["foo"], row: 0, col: 3 };
    expect(buf.deleteWordForward(state)).toBe(state);
  });

  it("only touches the active row in a multi-line buffer", () => {
    const state = { lines: ["keep me", "foo bar"], row: 1, col: 7 };
    expect(buf.deleteWordBack(state)).toEqual({ lines: ["keep me", "foo "], row: 1, col: 4 });
  });
});
