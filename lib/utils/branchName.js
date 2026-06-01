// Git branch-name rules, mirroring `git check-ref-format` for refs/heads/<name>.
// Used to validate freeform branch-name input and to offer a cleaned suggestion.

// Printable characters git forbids anywhere in a ref name (besides control chars,
// which are checked separately to keep this regex lint-safe).
const FORBIDDEN_CHARS = /[ ~^:?*[\\]/;

/**
 * Validate a branch name against git's ref-format rules.
 * @param {string} input - Raw user input
 * @returns {string | undefined} An error message, or undefined when valid
 */
export function validateBranchName(input) {
  const name = (input ?? "").trim();
  if (!name) return "Branch name is required.";

  if (name === "@") return "Branch name cannot be '@'.";
  if (name.startsWith("-")) return "Branch name cannot start with a dash.";
  if (name.startsWith("/") || name.endsWith("/"))
    return "Branch name cannot start or end with a slash.";
  if (name.endsWith(".")) return "Branch name cannot end with a dot.";
  if (name.includes("..")) return "Branch name cannot contain '..'.";
  if (name.includes("//")) return "Branch name cannot contain consecutive slashes.";
  if (name.includes("@{")) return "Branch name cannot contain '@{'.";

  if (FORBIDDEN_CHARS.test(name))
    return "Branch name cannot contain spaces or any of: ~ ^ : ? * [ \\";

  for (const ch of name) {
    const code = ch.codePointAt(0);
    if (code < 0x20 || code === 0x7f)
      return "Branch name cannot contain control characters.";
  }

  for (const part of name.split("/")) {
    if (part.startsWith(".")) return "Branch name path segments cannot start with a dot.";
    if (part.endsWith(".lock")) return "Branch name path segments cannot end with '.lock'.";
  }

  return undefined;
}

/**
 * Derive a valid git branch name from arbitrary input. Lowercases, turns
 * whitespace into hyphens, drops forbidden characters, and tidies each
 * slash-separated segment so the result passes {@link validateBranchName}.
 * @param {string} input - Raw user input
 * @returns {string} A cleaned branch name (may be empty if nothing usable remains)
 */
export function cleanBranchName(input) {
  return (input ?? "")
    .trim()
    .toLowerCase()
    .split("/")
    .map((segment) =>
      segment
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]+/g, "")
        .replace(/\.{2,}/g, ".")
        .replace(/-{2,}/g, "-")
        .replace(/\.lock$/, "")
        .replace(/^[-.]+/, "")
        .replace(/[-.]+$/, ""),
    )
    .filter(Boolean)
    .join("/");
}
