import axios from "axios";

/**
 * @typedef {object} GitLabIssuesProviderConfig
 * @property {string} apiUrl - GitLab API base URL
 * @property {string} token - GitLab personal access token
 * @property {string} projectPath - Full project path (e.g., "group/project")
 */

/**
 * Creates a GitLab Issues task provider.
 * @param {GitLabIssuesProviderConfig} options
 * @returns {import("../../types.js").TaskProvider}
 */
export function createGitLabIssuesProvider({ apiUrl, token, projectPath }) {
  if (!apiUrl) throw new Error("GitLab Issues provider requires apiUrl");
  if (!token) throw new Error("GitLab Issues provider requires token");
  if (!projectPath) throw new Error("GitLab Issues provider requires projectPath");

  const gitlab = axios.create({
    baseURL: apiUrl,
    headers: {
      "PRIVATE-TOKEN": token,
    },
  });

  const ticketKeyPattern = /^#?\d+$/;

  /**
   * Extracts a GitLab issue number from a plain number or a GitLab issues URL.
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
    console.log(`Fetching GitLab issue #${ticketKey}...`);
    const { data } = await gitlab.get(`/projects/${encodeURIComponent(projectPath)}/issues/${ticketKey}`);

    return {
      key: "#" + ticketKey,
      summary: data.title,
      description: data.description || "",
      status: data.state,
      issueType: data.labels[0] || "issue",
    };
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket };
}
