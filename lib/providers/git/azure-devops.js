import { toKebabCase, createAzureDevOpsClient } from "./utils.js";

/**
 * @typedef {object} AzureDevOpsProviderConfig
 * @property {string} orgUrl - Azure DevOps organization URL
 * @property {string} token - Personal access token
 */

/**
 * Creates an Azure DevOps git provider.
 * @param {AzureDevOpsProviderConfig} options
 * @returns {import("../../types.js").GitProvider}
 */
export function createAzureDevOpsProvider({ orgUrl, token }) {
  if (!orgUrl) throw new Error("Azure DevOps provider requires orgUrl");
  if (!token) throw new Error("Azure DevOps provider requires token");

  const client = createAzureDevOpsClient(orgUrl, token);

  /**
   * @param {string} ticketKey
   * @param {string} summary
   * @returns {string} Branch name capped at 200 characters
   */
  function generateBranchName(ticketKey, summary) {
    const kebab = toKebabCase(summary);
    const name = `${ticketKey}-${kebab}`;
    return name.slice(0, 200);
  }

  /**
   * @param {import("../../types.js").ProjectConfig} projectConfig
   * @param {string} ticketKey
   * @returns {Promise<string | null>}
   */
  async function findBranch(projectConfig, ticketKey) {
    const [project, repo] = projectConfig.repoPath.split("/");
    if (!project || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    try {
      const { data } = await client.get(`/${project}/_apis/git/repositories/${repo}/refs`, {
        params: { filter: "heads/", filterContains: ticketKey },
      });
      const match = data.value.find((ref) => {
        const name = ref.name.replace(/^refs\/heads\//, "");
        return name.toLowerCase().startsWith(`${ticketKey.toLowerCase()}-`);
      });
      return match ? match.name.replace(/^refs\/heads\//, "") : null;
    } catch {
      return null;
    }
  }

  /**
   * @param {import("../../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @returns {Promise<void>}
   */
  async function createBranch(projectConfig, branchName) {
    const [project, repo] = projectConfig.repoPath.split("/");
    if (!project || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }

    const { data: existing } = await client.get(`/${project}/_apis/git/repositories/${repo}/refs`, {
      params: { filter: `heads/${branchName}` },
    });

    if (existing.value.length > 0) {
      console.log(`Branch '${branchName}' already exists on Azure DevOps.`);
      return;
    }

    console.log(`Creating branch '${branchName}' from '${projectConfig.defaultBranch}'...`);
    const { data: defaultRef } = await client.get(`/${project}/_apis/git/repositories/${repo}/refs`, {
      params: { filter: `heads/${projectConfig.defaultBranch}` },
    });
    const defaultBranchSha = defaultRef.value[0].objectId;

    await client.post(`/${project}/_apis/git/repositories/${repo}/refs`, [
      {
        name: `refs/heads/${branchName}`,
        oldObjectId: "0000000000000000000000000000000000000000",
        newObjectId: defaultBranchSha,
      },
    ]);

    console.log(`Branch '${branchName}' created.`);
  }

  /**
   * @param {import("../../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @param {import("../../types.js").Ticket} ticket
   * @returns {Promise<string>} PR web URL
   */
  async function createPR(projectConfig, branchName, ticket) {
    const [project, repo] = projectConfig.repoPath.split("/");
    if (!project || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }

    const { data: existing } = await client.get(`/${project}/_apis/git/repositories/${repo}/pullrequests`, {
      params: {
        "searchCriteria.sourceRefName": `refs/heads/${branchName}`,
        "searchCriteria.status": "active",
      },
    });

    if (existing.value.length > 0) {
      const pr = existing.value[0];
      const url = `${orgUrl}/${project}/_git/${repo}/pullrequest/${pr.pullRequestId}`;
      console.log(`PR already exists: ${url}`);
      return url;
    }

    console.log(`Creating draft PR for '${branchName}'...`);
    const { data: pr } = await client.post(`/${project}/_apis/git/repositories/${repo}/pullrequests`, {
      sourceRefName: `refs/heads/${branchName}`,
      targetRefName: `refs/heads/${projectConfig.defaultBranch}`,
      title: `Draft: ${ticket.key} ${ticket.summary}`,
      isDraft: true,
    });

    const url = `${orgUrl}/${project}/_git/${repo}/pullrequest/${pr.pullRequestId}`;
    console.log(`Draft PR created: ${url}`);
    return url;
  }

  return { generateBranchName, findBranch, createBranch, createPR };
}
