import { createAzureDevOpsClient } from "../git/utils.js";

/**
 * @typedef {object} AzureDevOpsTicketProviderConfig
 * @property {string} orgUrl - Organization URL (e.g., "https://dev.azure.com/myorg")
 * @property {string} token - Personal access token
 * @property {string} project - Project name
 */

/**
 * Creates an Azure DevOps ticket provider.
 * @param {AzureDevOpsTicketProviderConfig} options
 * @returns {import("../../types.js").TaskProvider}
 */
export function createAzureDevOpsTicketProvider({ orgUrl, token, project }) {
  if (!orgUrl) throw new Error("Azure DevOps ticket provider requires orgUrl");
  if (!token) throw new Error("Azure DevOps ticket provider requires token");
  if (!project) throw new Error("Azure DevOps ticket provider requires project");

  const ado = createAzureDevOpsClient(orgUrl, token);

  const ticketKeyPattern = /^\d+$/;

  /**
   * Extracts an Azure DevOps work item ID from a plain number or a work items URL.
   * @param {string | null | undefined} input
   * @returns {string | null | undefined}
   */
  function parseTicketKey(input) {
    if (!input) return input;

    const stripped = input.replace(/^#/, "");
    if (/^\d+$/.test(stripped)) return stripped;

    try {
      const url = new URL(input);
      const match = url.pathname.match(/\/_workitems\/edit\/(\d+)/);
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
    console.log(`Fetching Azure DevOps work item ${ticketKey}...`);
    const { data } = await ado.get(`/${project}/_apis/wit/workitems/${ticketKey}`, {
      params: { "$expand": "all" },
    });

    const fields = data.fields;
    const rawDescription = fields["System.Description"] || "";
    const description = rawDescription.replace(/<[^>]*>/g, "");

    return {
      key: ticketKey,
      summary: fields["System.Title"],
      description: description || "",
      status: fields["System.State"],
      issueType: fields["System.WorkItemType"],
    };
  }

  return { ticketKeyPattern, parseTicketKey, fetchTicket };
}
