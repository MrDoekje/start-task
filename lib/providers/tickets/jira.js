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

  /**
   * Parses inline markdown marks (**bold**, `code`) into ADF text nodes.
   * @param {string} text
   * @returns {object[]}
   */
  function parseInlineMarks(text) {
    const nodes = [];
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
      }
      if (match[2]) {
        nodes.push({ type: "text", text: match[2], marks: [{ type: "strong" }] });
      } else if (match[3]) {
        nodes.push({ type: "text", text: match[3], marks: [{ type: "code" }] });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push({ type: "text", text: text.slice(lastIndex) });
    }

    return nodes.length > 0 ? nodes : [{ type: "text", text }];
  }

  /**
   * Converts markdown-formatted text into a Jira Atlassian Document Format document.
   * Supports: bullet lists (- item), ordered lists (1. item), **bold**, `code`,
   * and headings (converted to bold paragraphs).
   * @param {string} text
   * @returns {object}
   */
  function textToADF(text) {
    const lines = text.split("\n");
    const content = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i++; continue; }

      // Bullet list (- or * prefix)
      if (/^\s*[-*]\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s/, ""));
          i++;
        }
        content.push({
          type: "bulletList",
          content: items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: parseInlineMarks(item) }],
          })),
        });
        continue;
      }

      // Ordered list (1. prefix)
      if (/^\s*\d+\.\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
          i++;
        }
        content.push({
          type: "orderedList",
          content: items.map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: parseInlineMarks(item) }],
          })),
        });
        continue;
      }

      // Heading → bold paragraph
      if (/^#+\s/.test(line)) {
        const heading = line.replace(/^#+\s/, "");
        content.push({
          type: "paragraph",
          content: [{ type: "text", text: heading, marks: [{ type: "strong" }] }],
        });
        i++;
        continue;
      }

      // Regular paragraph
      content.push({ type: "paragraph", content: parseInlineMarks(line) });
      i++;
    }

    return {
      type: "doc",
      version: 1,
      content: content.length > 0 ? content : [{ type: "paragraph", content: [] }],
    };
  }

  /**
   * Creates a Jira issue and returns the new ticket key.
   * @param {{ project: string, issueType: string, summary: string, description?: string, customFieldValues?: Record<string, string> }} options
   * @returns {Promise<string>} The created ticket key (e.g. "OC-123")
   */
  async function createTicket({ project, issueType, summary, description, customFieldValues = {} }) {
    const customFieldNames = Object.keys(customFieldValues);
    const customFieldIds = customFieldNames.length > 0
      ? await findCustomFieldIds(...customFieldNames)
      : {};

    const fields = {
      project: { key: project },
      summary,
      issuetype: { name: issueType },
    };

    if (description) {
      fields.description = textToADF(description);
    }

    for (const [name, value] of Object.entries(customFieldValues)) {
      const fieldId = customFieldIds[name];
      if (fieldId && value) {
        fields[fieldId] = textToADF(value);
      }
    }

    console.log(`Creating Jira ticket in ${project}...`);
    const { data } = await jira.post("/rest/api/3/issue", { fields });
    return data.key;
  }

  /**
   * Updates an existing Jira issue. Only provided fields are changed.
   * @param {string} ticketKey - The ticket key (e.g. "OC-123")
   * @param {{ summary?: string, description?: string, customFieldValues?: Record<string, string> }} options
   * @returns {Promise<void>}
   */
  async function updateTicket(ticketKey, { summary, description, customFieldValues = {} } = {}) {
    const customFieldNames = Object.keys(customFieldValues);
    const customFieldIds = customFieldNames.length > 0
      ? await findCustomFieldIds(...customFieldNames)
      : {};

    const fields = {};

    if (summary) {
      fields.summary = summary;
    }

    if (description) {
      fields.description = textToADF(description);
    }

    for (const [name, value] of Object.entries(customFieldValues)) {
      const fieldId = customFieldIds[name];
      if (fieldId && value) {
        fields[fieldId] = textToADF(value);
      }
    }

    if (Object.keys(fields).length === 0) {
      throw new Error("Nothing to update — provide at least one field");
    }

    console.log(`Updating Jira ticket ${ticketKey}...`);
    await jira.put(`/rest/api/3/issue/${ticketKey}`, { fields });
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket, createTicket, updateTicket };
}
