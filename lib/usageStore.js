import { homedir } from "os";
import { join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";

const STATE_DIR = join(homedir(), ".start-task");
const USAGE_FILE = join(STATE_DIR, "usage.json");

/**
 * @typedef {Record<string, { count: number, lastUsed: number }>} UsageMap
 */

/**
 * Loads flow usage counts from disk. Returns an empty object if the file is
 * missing or malformed — usage tracking must never break the TUI.
 * @returns {UsageMap}
 */
export function loadUsage() {
  try {
    if (!existsSync(USAGE_FILE)) return {};
    const raw = readFileSync(USAGE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Increments the usage counter for `flowKey` and persists to disk. Any I/O
 * error is swallowed so a corrupt state file never blocks a flow.
 * @param {string} flowKey
 */
export function recordUsage(flowKey) {
  try {
    const usage = loadUsage();
    const entry = usage[flowKey] ?? { count: 0, lastUsed: 0 };
    usage[flowKey] = { count: entry.count + 1, lastUsed: Date.now() };
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch {
    // ignore — tracking is best-effort
  }
}

/**
 * Returns the top-N flow keys by usage, filtered to those that still exist in
 * `availableKeys`. Ties are broken by most recent use.
 * @param {UsageMap} usage
 * @param {Set<string>} availableKeys
 * @param {number} limit
 * @returns {string[]}
 */
export function topFlowKeys(usage, availableKeys, limit) {
  if (limit <= 0) return [];
  return Object.entries(usage)
    .filter(([key]) => availableKeys.has(key))
    .sort(([, a], [, b]) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .map(([key]) => key);
}
