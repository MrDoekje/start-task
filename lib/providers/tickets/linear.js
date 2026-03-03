import axios from "axios";

/**
 * @typedef {object} LinearProviderConfig
 * @property {string} apiKey - Linear API key
 */

/**
 * Creates a Linear task provider.
 * @param {LinearProviderConfig} options
 * @returns {import("../../types.js").TaskProvider}
 */
export function createLinearProvider({ apiKey }) {
  if (!apiKey) throw new Error("Linear provider requires apiKey");

  const linear = axios.create({
    baseURL: "https://api.linear.app",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
  });

  const ticketKeyPattern = /^[A-Z]+-\d+$/;

  /**
   * Extracts a Linear issue key from a plain key or a Linear issue URL.
   * @param {string | null | undefined} input
   * @returns {string | null | undefined}
   */
  function parseTicketKey(input) {
    if (!input) return input;
    if (ticketKeyPattern.test(input)) return input;

    try {
      const url = new URL(input);
      const match = url.pathname.match(/\/issue\/([A-Z]+-\d+)/);
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
    console.log(`Fetching Linear issue ${ticketKey}...`);
    const { data } = await linear.post("/graphql", {
      query: `query { issue(id: "${ticketKey}") { identifier title description state { name } labels { nodes { name } } } }`,
    });

    const issue = data.data.issue;

    return {
      key: issue.identifier,
      summary: issue.title,
      description: issue.description || "",
      status: issue.state.name,
      issueType: issue.labels.nodes[0]?.name || "issue",
    };
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket };
}
