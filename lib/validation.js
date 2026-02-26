/**
 * @param {string[]} keys - Project keys to validate
 * @param {string[]} validKeys - Known valid project keys
 * @throws {Error} If any key is not in validKeys
 */
export function validateProjectKeys(keys, validKeys) {
  const valid = new Set(validKeys);
  const invalid = keys.filter((k) => !valid.has(k));
  if (invalid.length > 0) {
    throw new Error(`Unknown project(s): ${invalid.join(", ")}. Valid: ${validKeys.join(", ")}`);
  }
}

/**
 * Formats an error into a detailed multi-line string for logging.
 * @param {Error & { response?: object }} err
 * @returns {string}
 */
export function formatError(err) {
  const lines = [];
  lines.push("═".repeat(60));
  lines.push("  START-TASK FAILED");
  lines.push("═".repeat(60));
  lines.push("");
  lines.push(`  Error: ${err.message || err}`);

  if (err.response) {
    lines.push(`  HTTP Status: ${err.response.status} ${err.response.statusText || ""}`);
    lines.push(`  URL: ${err.response.config?.method?.toUpperCase()} ${err.response.config?.url}`);
    if (err.response.data) {
      const body =
        typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data, null, 2);
      lines.push("");
      lines.push("  API Response:");
      for (const line of body.split("\n")) {
        lines.push(`    ${line}`);
      }
    }
  }

  if (err.stack) {
    lines.push("");
    lines.push("  Stack trace:");
    for (const line of err.stack.split("\n").slice(1)) {
      lines.push(`  ${line}`);
    }
  }

  lines.push("");
  lines.push("═".repeat(60));
  return lines.join("\n");
}
