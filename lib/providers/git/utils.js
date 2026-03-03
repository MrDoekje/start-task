import axios from "axios";

/**
 * @param {string} str
 * @returns {string}
 */
export function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Creates an axios client for Azure DevOps REST API.
 * @param {string} orgUrl - Organization URL (e.g., "https://dev.azure.com/myorg")
 * @param {string} token - Personal access token
 * @returns {import("axios").AxiosInstance}
 */
export function createAzureDevOpsClient(orgUrl, token) {
  const auth = Buffer.from(`:${token}`).toString("base64");
  return axios.create({
    baseURL: orgUrl,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    params: { "api-version": "7.1" },
  });
}
