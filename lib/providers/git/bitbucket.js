import axios from "axios";
import { toKebabCase } from "./utils.js";

/**
 * @typedef {object} BitbucketProviderConfig
 * @property {string} [apiUrl] - Bitbucket API base URL (defaults to https://api.bitbucket.org/2.0)
 * @property {string} token - Bitbucket token (app password or access token)
 * @property {string} [username] - Bitbucket username (when provided, uses Basic auth)
 */

/**
 * Creates a Bitbucket git provider.
 * @param {BitbucketProviderConfig} options
 * @returns {import("../../types.js").GitProvider}
 */
export function createBitbucketProvider({ apiUrl = "https://api.bitbucket.org/2.0", token, username }) {
  if (!token) throw new Error("Bitbucket provider requires token");

  const authorization = username
    ? `Basic ${Buffer.from(`${username}:${token}`).toString("base64")}`
    : `Bearer ${token}`;

  const bitbucket = axios.create({
    baseURL: apiUrl,
    headers: { Authorization: authorization },
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
    const [workspace, repoSlug] = projectConfig.repoPath.split("/");
    if (!workspace || !repoSlug) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    try {
      const { data } = await bitbucket.get(`/repositories/${workspace}/${repoSlug}/refs/branches`, {
        params: { q: `name~"${ticketKey}"` },
      });
      const match = (data.values || []).find((b) =>
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
    const [workspace, repoSlug] = projectConfig.repoPath.split("/");
    if (!workspace || !repoSlug) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }
    const encodedBranch = encodeURIComponent(branchName);

    try {
      await bitbucket.get(`/repositories/${workspace}/${repoSlug}/refs/branches/${encodedBranch}`);
      console.log(`Branch '${branchName}' already exists on Bitbucket.`);
      return;
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }

    console.log(`Creating branch '${branchName}' from '${projectConfig.defaultBranch}'...`);
    const { data: baseBranch } = await bitbucket.get(
      `/repositories/${workspace}/${repoSlug}/refs/branches/${encodeURIComponent(projectConfig.defaultBranch)}`,
    );

    await bitbucket.post(`/repositories/${workspace}/${repoSlug}/refs/branches`, {
      name: branchName,
      target: { hash: baseBranch.target.hash },
    });
    console.log(`Branch '${branchName}' created.`);
  }

  /**
   * @param {import("../../types.js").ProjectConfig} projectConfig
   * @param {string} branchName
   * @param {import("../../types.js").Ticket} ticket
   * @returns {Promise<string>} PR web URL
   */
  async function createPR(projectConfig, branchName, ticket) {
    const [workspace, repoSlug] = projectConfig.repoPath.split("/");
    if (!workspace || !repoSlug) {
      throw new Error(`Invalid repoPath: ${projectConfig.repoPath}`);
    }

    const { data: existing } = await bitbucket.get(`/repositories/${workspace}/${repoSlug}/pullrequests`, {
      params: { q: `source.branch.name="${branchName}" AND state="OPEN"` },
    });

    if ((existing.values || []).length > 0) {
      const prUrl = existing.values[0].links.html.href;
      console.log(`PR already exists: ${prUrl}`);
      return prUrl;
    }

    console.log(`Creating draft PR for '${branchName}'...`);
    const { data: pr } = await bitbucket.post(`/repositories/${workspace}/${repoSlug}/pullrequests`, {
      title: `Draft: ${ticket.key} ${ticket.summary}`,
      source: { branch: { name: branchName } },
      destination: { branch: { name: projectConfig.defaultBranch } },
    });

    const prUrl = pr.links.html.href;
    console.log(`Draft PR created: ${prUrl}`);
    return prUrl;
  }

  return { generateBranchName, findBranch, createBranch, createPR };
}
