import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Runs a step's validate → optional → transform → postValidate pipeline.
 * Returns `{ value }` on success, `{ error }` on validation failure.
 * @param {string} raw
 * @param {import("../types.js").WizardStep} step
 * @param {import("../types.js").ActionUtils} utils
 * @param {import("../types.js").Config} config
 * @returns {{ value: any } | { error: string }}
 */
export function runStepPipeline(raw, step, utils, config) {
  const trimmed = raw?.trim?.() ?? "";
  if (step.validate) {
    const err = step.validate(raw);
    if (err) return { error: err };
  }
  if (step.optional && !trimmed) return { value: undefined };
  let next = trimmed || raw;
  if (step.transform) next = step.transform(raw, utils, config);
  if (step.postValidate) {
    const err = step.postValidate(next, utils, config);
    if (err) return { error: err };
  }
  return { value: next };
}

/**
 * Resolves a step's `options` field (function or array) against the current config.
 * @param {import("../types.js").WizardStep} step
 * @param {import("../types.js").Config} config
 */
export function resolveStepOptions(step, config) {
  return typeof step.options === "function" ? step.options(config) : step.options;
}

const COMMENT_LINE = /^#/;

/**
 * Pauses Ink's raw-mode, opens $EDITOR on a tempfile seeded with `initial`,
 * waits for save, then returns the file contents. Tempfile is cleaned up
 * best-effort. Caller is responsible for re-applying validate/transform.
 *
 * @param {object} opts
 * @param {string} opts.initial - seed contents (excluding header)
 * @param {string} [opts.header] - prepended to the tempfile; lines starting with # are stripped on read
 * @param {string} [opts.fileName] - tempfile name (default "input.txt")
 * @param {(mode: boolean) => void} opts.setRawMode - Ink's setRawMode
 * @param {boolean} opts.isRawModeSupported
 * @param {boolean} [opts.stripComments] - filter out `# ` lines after read
 * @returns {string}
 */
export function spawnEditor({ initial, header, fileName, setRawMode, isRawModeSupported, stripComments }) {
  const dir = mkdtempSync(join(tmpdir(), "start-task-"));
  const tmpFile = join(dir, fileName || "input.txt");
  writeFileSync(tmpFile, (header ?? "") + (initial ?? ""), "utf8");

  const editor = process.env.VISUAL || process.env.EDITOR || "vi";
  if (isRawModeSupported) setRawMode(false);
  try {
    execFileSync(editor, [tmpFile], { stdio: "inherit" });
  } finally {
    if (isRawModeSupported) setRawMode(true);
  }

  const raw = readFileSync(tmpFile, "utf8");
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }

  if (!stripComments) return raw.replace(/\n+$/, "");
  return raw
    .split("\n")
    .filter((line) => !COMMENT_LINE.test(line))
    .join("\n")
    .trim();
}

export const EDITOR_NAME = (process.env.VISUAL || process.env.EDITOR || "vi").split("/").pop();
