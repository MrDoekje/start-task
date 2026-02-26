import { markdownSections, taskHeader } from "../lib/presets/prompts.js";
import { ticketSections } from "./shared.js";

/**
 * Example "Investigate" action: fetches a ticket and launches a read-only
 * agent session to analyze the codebase without making changes.
 *
 * @param {Record<string, unknown>} results
 * @param {import("../lib/types.js").Config} config
 * @param {import("../lib/types.js").ActionUtils} utils
 */
export async function investigateAction(results, config, utils) {
  const { ticketKey, projectKeys } = results;
  utils.validateProjectKeys(projectKeys, Object.keys(config.projects));

  const ticket = await config.taskProvider.fetchTicket(ticketKey);
  console.log(`Ticket: ${ticket.key} — ${ticket.summary}`);

  const workspaceRoot = utils.expandHome(config.workspaceRoot);
  const isSingle = projectKeys.length === 1;

  const prompt =
    taskHeader("investigate", ticket.key, ticket.summary) +
    ticketSections(ticket) +
    markdownSections(
      [
        !isSingle && {
          heading: "Projects to Investigate",
          body: projectKeys
            .map((key) => `- **${key}**: \`${utils.resolve(workspaceRoot, key)}\``)
            .join("\n"),
        },
        {
          heading: "Important",
          body: isSingle
            ? `- You are investigating in the **${projectKeys[0]}** project\n- Do NOT make any code changes\n- Do NOT create branches or commits`
            : `- Do NOT make any code changes\n- Do NOT create branches or commits`,
        },
      ].filter(Boolean),
    ) +
    "\nProduce an implementation outline for this ticket." +
    (!isSingle
      ? " Cover each project listed above and note any cross-project dependencies or implementation order."
      : "");

  const cwd = isSingle ? utils.resolve(workspaceRoot, projectKeys[0]) : workspaceRoot;
  utils.launchTask(cwd, prompt, `investigate-${ticketKey}`);
  console.log("Investigation started successfully.");
}
