import axios from "axios";
import { toKebabCase } from "./utils.js";

/**
 * @typedef {object} GitLabProviderConfig
 * @property {string} apiUrl - GitLab API base URL
 * @property {string} token - GitLab private token
 */

/**
 * Creates a GitLab git provider.
 * @param {GitLabProviderConfig} options
 * @returns {import("../../types.js").GitProvider}
 */
export function createGitLabProvider({ apiUrl, token }) {
  if (!apiUrl) throw new Error("GitLab provider requires apiUrl");
  if (!token) throw new Error("GitLab provider requires token");

  const gitlab = axios.create({
    baseURL: apiUrl,
    headers: { "PRIVATE-TOKEN": token },
  });

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
    const encodedPath = encodeURIComponent(projectConfig.repoPath);
    try {
      const { data: branches } = await gitlab.get(`/projects/${encodedPath}/repository/branches`, {
        params: { search: ticketKey },
      });
      const match = branches.find((b) =>
        b.name.toLowerCase().startsWith(`${ticketKey.toLowerCase()}-`),
      );
      return match ? match.name : null;
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
    const encodedPath = encodeURIComponent(projectConfig.repoPath);
    const encodedBranch = encodeURIComponent(branchName);

    try {
      await gitlab.get(`/projects/${encodedPath}/repository/branches/${encodedBranch}`);
      console.log(`Branch '${branchName}' already exists on GitLab.`);
      return;
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }

    console.log(`Creating branch '${branchName}' from '${projectConfig.defaultBranch}'...`);
    await gitlab.post(`/projects/${encodedPath}/repository/branches`, {
      branch: branchName,
      ref: projectConfig.defaultBranch,
    });
    console.log(`Branch '${branchName}' created.`);
  }

  /**
   * @param {import("../../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @param {import("../../types.js").Ticket} ticket
   * @returns {Promise<string>} MR web URL
   */
  async function createPR(projectConfig, branchName, ticket) {
    const encodedPath = encodeURIComponent(projectConfig.repoPath);

    const { data: existing } = await gitlab.get(`/projects/${encodedPath}/merge_requests`, {
      params: { source_branch: branchName, state: "opened" },
    });

    if (existing.length > 0) {
      console.log(`MR already exists: ${existing[0].web_url}`);
      return existing[0].web_url;
    }

    console.log(`Creating draft MR for '${branchName}'...`);
    const { data: mr } = await gitlab.post(`/projects/${encodedPath}/merge_requests`, {
      source_branch: branchName,
      target_branch: projectConfig.defaultBranch,
      title: `Draft: ${ticket.key} ${ticket.summary}`,
    });
    console.log(`Draft MR created: ${mr.web_url}`);
    return mr.web_url;
  }

  return { generateBranchName, findBranch, createBranch, createPR };
}
