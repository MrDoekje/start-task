import axios from "axios";

/**
 * @typedef {object} GitHubIssuesProviderConfig
 * @property {string} [apiUrl] - GitHub API base URL (defaults to "https://api.github.com")
 * @property {string} token - GitHub personal access token
 * @property {string} owner - Repository owner
 * @property {string} repo - Repository name
 */

/**
 * Creates a GitHub Issues task provider.
 * @param {GitHubIssuesProviderConfig} options
 * @returns {import("../../types.js").TaskProvider}
 */
export function createGitHubIssuesProvider({ apiUrl = "https://api.github.com", token, owner, repo }) {
  if (!token) throw new Error("GitHub Issues provider requires token");
  if (!owner) throw new Error("GitHub Issues provider requires owner");
  if (!repo) throw new Error("GitHub Issues provider requires repo");

  const github = axios.create({
    baseURL: apiUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  const ticketKeyPattern = /^#?\d+$/;

  /**
   * Extracts a GitHub issue number from a plain number or a GitHub issues URL.
   * @param {string | null | undefined} input
   * @returns {string | null | undefined}
   */
  function parseTicketKey(input) {
    if (!input) return input;

    const stripped = input.replace(/^#/, "");
    if (/^\d+$/.test(stripped)) return stripped;

    try {
      const url = new URL(input);
      const match = url.pathname.match(/\/issues\/(\d+)/);
      if (match) return match[1];
    } catch {
      // Not a valid URL, fall through
    }

    return input;
  }

  /**
   * @param {string} ticketKey
   * @returns {Promise<import("../../types.js").Ticket>}
   */
  async function fetchTicket(ticketKey) {
    console.log(`Fetching GitHub issue #${ticketKey}...`);
    const { data } = await github.get(`/repos/${owner}/${repo}/issues/${ticketKey}`);

    return {
      key: "#" + ticketKey,
      summary: data.title,
      description: data.body || "",
      status: data.state,
      issueType: data.labels[0]?.name || "issue",
    };
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket };
}
