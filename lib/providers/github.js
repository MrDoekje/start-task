import axios from "axios";
import { toKebabCase } from "./gitlab.js";

/**
 * @typedef {object} GitHubProviderConfig
 * @property {string} apiUrl - GitHub API base URL
 * @property {string} token - GitHub token
 */

/**
 * @typedef {object} GitProvider
 * @property {(ticketKey: string, summary: string) => string} generateBranchName - Generate a branch name from ticket key and summary
 * @property {(projectConfig: import("../types.js").ProjectConfig, ticketKey: string) => Promise<string|null>} findBranch - Find an existing branch matching a ticket key
 * @property {(projectConfig: import("../types.js").ProjectConfig, branchName: string) => Promise<void>} createBranch - Create a branch on the remote
 * @property {(projectConfig: import("../types.js").ProjectConfig, branchName: string, ticket: import("../types.js").Ticket) => Promise<string>} createPR - Create a pull request, returns URL
 */

/**
 * Creates a GitHub git provider.
 * @param {GitHubProviderConfig} options
 * @returns {GitProvider}
 */
export function createGitHubProvider({ apiUrl, token }) {
  if (!apiUrl) throw new Error("GitHub provider requires apiUrl");
  if (!token) throw new Error("GitHub provider requires token");

  const github = axios.create({
    baseURL: apiUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
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
   * @param {import("../types.js").ProjectConfig} projectConfig
   * @param {string} ticketKey
   * @returns {Promise<string | null>}
   */
  async function findBranch(projectConfig, ticketKey) {
    const [owner, repo] = projectConfig.repoPath.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    const repoSlug = `${owner}/${repo}`;
    try {
      const { data } = await github.get(`/repos/${repoSlug}/branches`, {
        params: { per_page: 100 },
      });
      const match = data.find((b) =>
        b.name.toLowerCase().startsWith(`${ticketKey.toLowerCase()}-`),
      );
      return match ? match.name : null;
    } catch {
      return null;
    }
  }

  /**
   * @param {import("../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @returns {Promise<void>}
   */
  async function createBranch(projectConfig, branchName) {
    const [owner, repo] = projectConfig.repoPath.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    const repoSlug = `${owner}/${repo}`;
    const encodedBranch = encodeURIComponent(branchName);

    try {
      await github.get(`/repos/${repoSlug}/git/ref/heads/${encodedBranch}`);
      console.log(`Branch '${branchName}' already exists on GitHub.`);
      return;
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }

    console.log(`Creating branch '${branchName}' from '${projectConfig.defaultBranch}'...`);
    const { data: baseRef } = await github.get(
      `/repos/${repoSlug}/git/ref/heads/${encodeURIComponent(projectConfig.defaultBranch)}`,
    );

    await github.post(`/repos/${repoSlug}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    console.log(`Branch '${branchName}' created.`);
  }

  /**
   * @param {import("../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @param {import("../types.js").Ticket} ticket
   * @returns {Promise<string>} PR web URL
   */
  async function createPR(projectConfig, branchName, ticket) {
    const [owner, repo] = projectConfig.repoPath.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    const repoSlug = `${owner}/${repo}`;
    const { data: existing } = await github.get(`/repos/${repoSlug}/pulls`, {
      params: { head: `${owner}:${branchName}`, state: "open" },
    });

    if (existing.length > 0) {
      console.log(`PR already exists: ${existing[0].html_url}`);
      return existing[0].html_url;
    }

    console.log(`Creating draft PR for '${branchName}'...`);
    const { data: pr } = await github.post(`/repos/${repoSlug}/pulls`, {
      head: branchName,
      base: projectConfig.defaultBranch,
      title: `Draft: ${ticket.key} ${ticket.summary}`,
      draft: true,
    });

    console.log(`Draft PR created: ${pr.html_url}`);
    return pr.html_url;
  }

  return { generateBranchName, findBranch, createBranch, createPR };
}
