import { markdownSections, taskHeader } from "../lib/presets/prompts.js";
import { ticketSections, WORKFLOW_FOOTER } from "./shared.js";

/**
 * Example "Start Task" action: fetches a ticket, creates a branch + worktree,
 * opens a merge request, and launches an agent session with a full prompt.
 *
 * @param {Record<string, unknown>} results
 * @param {import("../lib/types.js").Config} config
 * @param {import("../lib/types.js").ActionUtils} utils
 */
export async function startAction(results, config, utils) {
  const { ticketKey, projectKeys, userContext } = results;
  utils.validateProjectKeys(projectKeys, Object.keys(config.projects));

  const ticket = await config.taskProvider.fetchTicket(ticketKey);
  console.log(`Ticket: ${ticket.key} — ${ticket.summary}`);

  const workspaceRoot = utils.expandHome(config.workspaceRoot);

  const prepared = [];
  for (const projectKey of projectKeys) {
    const projectConfig = config.projects[projectKey];
    const projectDir = utils.resolve(workspaceRoot, projectKey);

    let branchName = await config.git.findBranch(projectConfig, ticketKey);
    if (branchName) {
      console.log(`[${projectKey}] Found existing branch: ${branchName}`);
    } else {
      branchName = config.git.generateBranchName(ticketKey, ticket.summary);
      console.log(`[${projectKey}] Branch: ${branchName}`);
      await config.git.createBranch(projectConfig, branchName);
    }

    const mrUrl = await config.git.createPR(projectConfig, branchName, ticket);
    utils.gitFetch(projectDir);
    const worktreeDir = utils.ensureWorktree(projectDir, branchName);
    utils.runSetupSteps(projectDir, worktreeDir, projectConfig.setup);

    prepared.push({ projectKey, branchName, mrUrl, worktreeDir });
  }

  const isSingle = prepared.length === 1;
  const { projectKey, branchName, mrUrl, worktreeDir } = prepared[0];

  const prompt =
    taskHeader("work on", ticket.key, ticket.summary) +
    ticketSections(ticket) +
    markdownSections([
      isSingle
        ? { heading: "Merge Request", body: mrUrl }
        : {
            heading: "Projects",
            body: prepared
              .map(
                (p) => `- **${p.projectKey}**: worktree at \`${p.worktreeDir}\` — MR: ${p.mrUrl}`,
              )
              .join("\n"),
          },
      {
        heading: "Important",
        body: isSingle
          ? `- You are working in the **${projectKey}** project\n- Check the current state of the code and git history before making changes`
          : `- This is a multi-project task — you are responsible for **all** projects listed above\n- Keep changes in each project consistent`,
      },
      { heading: "Additional Context", body: userContext },
    ]) +
    WORKFLOW_FOOTER;

  if (isSingle) {
    utils.launchTask(worktreeDir, prompt, `task-${projectKey}-${branchName}`);
  } else {
    utils.launchTask(
      prepared.map((p) => p.worktreeDir),
      prompt,
      `task-${ticketKey}`,
    );
  }

  console.log("Task started successfully.");
}
