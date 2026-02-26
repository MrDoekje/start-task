import { fieldSections } from "../lib/presets/prompts.js";

/**
 * Formats a ticket into markdown sections.
 * Uses customFields bag for provider-specific fields.
 * @param {import("../lib/types.js").Ticket} ticket
 * @returns {string}
 */
export function ticketSections(ticket) {
  return fieldSections(ticket, [
    { heading: "Ticket Details", field: (t) => `- Type: ${t.issueType}\n- Status: ${t.status}` },
    { heading: "Description", field: "description" },
    { heading: "Acceptance Criteria", field: (t) => t.customFields?.["Acceptance Criteria"] },
    { heading: "Outline", field: (t) => t.customFields?.["Outline"] },
  ]);
}

export const WORKFLOW_FOOTER = `
## Workflow
If no outline is provided above, produce an implementation outline before writing any code.

After implementation is complete:
1. Review the changes against project design patterns
2. Add or update tests as appropriate
3. Verify the implementation works end-to-end

## Important: Avoid Getting Stuck
If any step fails twice, move on. Partial results that can be fixed manually are better than wasted time looping.`;
