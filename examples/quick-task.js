import { markdownSections } from "../lib/presets/prompts.js";

/**
 * Minimal "Quick Task" action: takes an instruction and project path from the
 * wizard, builds a prompt with tool-usage guidance, and launches an agent
 * session. No ticket provider, git provider, or worktree required.
 *
 * @param {Record<string, unknown>} results
 * @param {import("../lib/types.js").Config} config
 * @param {import("../lib/types.js").ActionUtils} utils
 */
export async function quickTaskAction(results, config, utils) {
  const { instruction, projectPath } = results;
  const cwd = utils.expandHome(projectPath);

  const prompt =
    `I need you to: ${instruction}\n\n` +
    markdownSections([
      {
        heading: "Tools at your disposal",
        body: [
          "- Use `npm test` (or the project's test command) to verify changes",
          "- Use `npm run lint` to check for style issues",
          "- Read the project documentation (CLAUDE.md, README.md, or equivalent) for project-specific instructions",
        ].join("\n"),
      },
      {
        heading: "Workflow",
        body: [
          "1. Read the relevant code before making changes",
          "2. Implement the requested changes",
          "3. Run tests and lint to verify",
          "",
          "If any step fails twice, move on. Partial results are better than wasted time looping.",
        ].join("\n"),
      },
    ]);

  utils.launchTask(cwd, prompt, "quick-task");
  console.log("Quick task started.");
}
