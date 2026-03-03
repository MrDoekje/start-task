/**
 * Renders a list of labeled markdown sections, skipping any with falsy content.
 *
 * @param {Array<{ heading: string, body: string }>} sections
 * @returns {string}
 *
 * @example
 * markdownSections([
 *   { heading: "Description", body: ticket.description },
 *   { heading: "Acceptance Criteria", body: ticket.acceptanceCriteria },
 * ]);
 */
export function markdownSections(sections) {
  return sections
    .filter((s) => s.body)
    .map((s) => `## ${s.heading}\n${s.body}\n`)
    .join("\n");
}

/**
 * Builds a one-line task header like: I need you to work on PROJ-123: "Fix the bug"
 *
 * @param {string} verb - e.g. "work on", "investigate", "review"
 * @param {string} key - task identifier (e.g. "PROJ-123")
 * @param {string} summary - short task summary
 * @returns {string}
 */
export function taskHeader(verb, key, summary) {
  return `I need you to ${verb} ${key}: "${summary}"\n\n`;
}

/**
 * Maps an object's fields to markdown sections.
 * Each field spec provides a heading and either a string key to read from the
 * object or a function that receives the object and returns the body text.
 *
 * @param {Record<string, unknown>} obj - any task/ticket/issue object
 * @param {Array<{ heading: string, field: string | ((obj: Record<string, unknown>) => string) }>} fields
 * @returns {string}
 *
 * @example
 * fieldSections(ticket, [
 *   { heading: "Description", field: "description" },
 *   { heading: "Details", field: (t) => `- Type: ${t.issueType}\n- Status: ${t.status}` },
 * ]);
 */
export function fieldSections(obj, fields) {
  return markdownSections(
    fields.map((f) => ({
      heading: f.heading,
      body: typeof f.field === "function" ? f.field(obj) : obj[f.field],
    })),
  );
}

/**
 * Renders ticket details, description, and any custom fields as markdown sections.
 * Works with any TaskProvider — custom fields are rendered dynamically.
 *
 * @param {import("../types.js").Ticket} ticket
 * @returns {string}
 */
export function ticketSections(ticket) {
  const sections = [
    { heading: "Ticket Details", body: `- Type: ${ticket.issueType}\n- Status: ${ticket.status}` },
    { heading: "Description", body: ticket.description },
  ];

  if (ticket.customFields) {
    for (const [name, value] of Object.entries(ticket.customFields)) {
      sections.push({ heading: name, body: value });
    }
  }

  return markdownSections(sections);
}

/**
 * Standard workflow footer with outline instructions and avoid-getting-stuck guidance.
 * @type {string}
 */
export const workflowFooter = `
## Workflow
If no outline is provided above, produce an implementation outline before writing any code.

After implementation is complete:
1. Review the changes against project design patterns
2. Add or update tests as appropriate
3. Verify the implementation works end-to-end

## Important: Avoid Getting Stuck
If any step fails twice, move on. Partial results that can be fixed manually are better than wasted time looping.`;
