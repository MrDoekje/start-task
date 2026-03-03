import axios from "axios";

/**
 * Recursively extracts plain text from a Jira Atlassian Document Format node.
 * @param {object | string | null} node
 * @returns {string}
 */
export function extractTextFromADF(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "inlineCard" && node.attrs?.url) return node.attrs.url;

  let text = "";
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractTextFromADF(child);
    }
  }

  switch (node.type) {
    case "paragraph":
    case "heading":
    case "blockquote":
    case "codeBlock":
    case "rule":
      text += "\n";
      break;
    case "listItem":
      text = "- " + text.trim() + "\n";
      break;
    case "orderedList":
    case "bulletList":
      text += "\n";
      break;
  }

  return text;
}

/**
 * Extracts text from a Jira field value (string or ADF object).
 * @param {string | object | null} value
 * @returns {string}
 */
export function extractFieldText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.type) return extractTextFromADF(value);
  return "";
}

/**
 * @typedef {object} JiraProviderConfig
 * @property {string} apiUrl - Jira API base URL
 * @property {string} email - Jira user email
 * @property {string} token - Jira API token
 * @property {string[]} [customFields] - Custom field names to fetch (e.g., ["Acceptance Criteria", "Outline"])
 */

/**
 * Creates a Jira task provider.
 * @param {JiraProviderConfig} options
 * @returns {import("../../types.js").TaskProvider}
 */
export function createJiraProvider({ apiUrl, email, token, customFields = [] }) {
  if (!apiUrl) throw new Error("Jira provider requires apiUrl");
  if (!email) throw new Error("Jira provider requires email");
  if (!token) throw new Error("Jira provider requires token");

  const jiraAuth = Buffer.from(`${email}:${token}`).toString("base64");
  const jira = axios.create({
    baseURL: apiUrl,
    headers: {
      Authorization: `Basic ${jiraAuth}`,
      Accept: "application/json",
    },
  });

  const ticketKeyPattern = /^[A-Z]+-\d+$/;

  /**
   * Extracts a Jira ticket key from a plain key or a Jira browse URL.
   * @param {string | null | undefined} input
   * @returns {string | null | undefined}
   */
  function parseTicketKey(input) {
    if (!input) return input;
    if (ticketKeyPattern.test(input)) return input;

    try {
      const url = new URL(input);
      const match = url.pathname.match(/\/browse\/([A-Z]+-\d+)/);
      if (match) return match[1];
    } catch {
      // Not a valid URL, fall through
    }

    return input;
  }

  /**
   * @param {string[]} names
   * @returns {Promise<Record<string, string>>}
   */
  async function findCustomFieldIds(...names) {
    const { data: fields } = await jira.get("/rest/api/3/field");
    const mapping = {};
    for (const name of names) {
      const field = fields.find((f) => f.name.toLowerCase() === name.toLowerCase());
      if (field) mapping[name] = field.id;
    }
    return mapping;
  }

  /**
   * @param {string} ticketKey
   * @returns {Promise<import("../../types.js").Ticket>}
   */
  async function fetchTicket(ticketKey) {
    console.log(`Fetching Jira ticket ${ticketKey}...`);
    const [response, customFieldIds] = await Promise.all([
      jira.get(`/rest/api/3/issue/${ticketKey}`),
      customFields.length > 0 ? findCustomFieldIds(...customFields) : {},
    ]);
    const { summary, description, status, issuetype } = response.data.fields;

    const custom = {};
    for (const [name, fieldId] of Object.entries(customFieldIds)) {
      const raw = response.data.fields[fieldId];
      if (raw) {
        const text = extractFieldText(raw).trim();
        if (text) custom[name] = text;
      }
    }

    return {
      key: ticketKey,
      summary,
      description: extractTextFromADF(description),
      status: status?.name || "Unknown",
      issueType: issuetype?.name || "Unknown",
      ...(Object.keys(custom).length > 0 ? { customFields: custom } : {}),
    };
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket };
}
