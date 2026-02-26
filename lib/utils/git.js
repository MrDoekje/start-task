import { execSync } from "child_process";
import { mkdirSync, copyFileSync, symlinkSync, existsSync } from "fs";
import { resolve, dirname, relative } from "path";

/**
 * @param {string} args - Git command arguments
 * @param {string} cwd - Working directory
 * @returns {string} Command output
 */
export function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: "utf-8" }).trim();
}

/**
 * @param {string} projectDir
 */
export function gitFetch(projectDir) {
  console.log("Fetching from origin...");
  git("fetch origin", projectDir);
}

/**
 * @param {string} baseDir
 * @param {string} namePattern - Glob pattern to match
 * @param {string} [excludePattern] - Glob pattern to exclude
 * @param {"f" | "d"} type - File or directory
 * @returns {string[]} Relative paths of matching entries
 */
export function findByPattern(baseDir, namePattern, excludePattern, type) {
  let cmd;
  if (type === "f") {
    cmd = `find "${baseDir}" \\( -name node_modules -o -name worktrees \\) -prune -o -type f -name "${namePattern}" -print`;
  } else {
    cmd = `find "${baseDir}" -name worktrees -prune -o -path "*/node_modules/node_modules" -prune -o -type d -name "${namePattern}" -print`;
  }

  let output;
  try {
    output = execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return [];
  }
  if (!output) return [];

  let results = output.split("\n").filter(Boolean);

  if (excludePattern) {
    const regexStr = "^" + excludePattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
    const excludeRegex = new RegExp(regexStr);
    results = results.filter((p) => !excludeRegex.test(p.split("/").pop()));
  }

  return results.map((p) => relative(baseDir, p));
}

/**
 * @param {string} projectDir
 * @param {string} worktreeDir
 * @param {import("../types.js").SetupStep[]} [steps]
 */
export function runSetupSteps(projectDir, worktreeDir, steps) {
  if (!steps || steps.length === 0) return;

  console.log("Running worktree setup...");

  for (const step of steps) {
    const type = step.action === "copy" ? "f" : "d";
    const matches = findByPattern(projectDir, step.pattern, step.excludePattern, type);

    if (matches.length === 0) {
      console.log(`  [${step.action}] No ${step.description} found, skipping.`);
      continue;
    }

    console.log(`  [${step.action}] ${step.description}: ${matches.length} found`);

    for (const relPath of matches) {
      const src = resolve(projectDir, relPath);
      const dest = resolve(worktreeDir, relPath);

      if (existsSync(dest)) {
        console.log(`    skip (exists): ${relPath}`);
        continue;
      }

      mkdirSync(dirname(dest), { recursive: true });

      if (step.action === "copy") {
        copyFileSync(src, dest);
        console.log(`    copied: ${relPath}`);
      } else if (step.action === "symlink") {
        symlinkSync(src, dest);
        console.log(`    symlinked: ${relPath}`);
      }
    }
  }
}

/**
 * @param {string} projectDir
 * @param {string} branchName
 * @param {string} worktreeDir - Target path for the worktree
 * @returns {string} Path to the worktree directory
 */
export function ensureWorktree(projectDir, branchName, worktreeDir) {
  const worktreeList = git("worktree list --porcelain", projectDir);
  if (worktreeList.includes(worktreeDir)) {
    console.log(`Worktree already exists at ${worktreeDir}`);
    return worktreeDir;
  }

  mkdirSync(dirname(worktreeDir), { recursive: true });

  try {
    git(`worktree add -b ${branchName} "${worktreeDir}" origin/${branchName}`, projectDir);
    console.log(`Worktree created at ${worktreeDir}`);
    return worktreeDir;
  } catch (err) {
    if (err.message?.includes("already exists")) {
      git(`worktree add "${worktreeDir}" ${branchName}`, projectDir);
      console.log(`Worktree created (existing branch) at ${worktreeDir}`);
      return worktreeDir;
    }
    throw err;
  }
}
