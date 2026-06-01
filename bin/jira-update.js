#!/usr/bin/env node

/**
 * CLI wrapper for updating Jira tickets.
 * Reads JSON from stdin with: { ticketKey, summary?, description?, customFieldValues? }
 * Only provided fields are updated.
 *
 * Usage:
 *   echo '{"ticketKey":"OC-123","description":"..."}' | node bin/jira-update.js
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Load .env from project root or parent
config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, "..", ".env") });

const { createJiraProvider } = await import("../lib/providers/jira.js");

const provider = createJiraProvider({
  apiUrl: process.env.JIRA_API_URL,
  email: process.env.JIRA_USER_EMAIL,
  token: process.env.JIRA_API_TOKEN,
  customFields: ["Acceptance Criteria", "Outline"],
});

const input = JSON.parse(readFileSync("/dev/stdin", "utf8"));

if (!input.ticketKey) {
  console.error("Error: ticketKey is required");
  process.exit(1);
}

const { ticketKey, ...updateFields } = input;
await provider.updateTicket(ticketKey, updateFields);

const baseUrl = process.env.JIRA_API_URL.replace(/\/+$/, "");
const browseUrl = `${baseUrl}/browse/${ticketKey}`;
console.log(`${ticketKey}\n${browseUrl}`);
