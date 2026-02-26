/**
 * Text step that prompts for a ticket key or URL and parses it via the taskProvider.
 * @type {import("../../types.js").WizardStep}
 */
export const ticketKeyStep = {
  type: "text",
  key: "ticketKey",
  message: "Ticket key or Jira URL?",
  placeholder: "PROJ-1234",
  validate(value) {
    if (!value?.trim()) return "Ticket key is required.";
  },
  transform(value, _utils, config) {
    return config.taskProvider.parseTicketKey(value.trim());
  },
  postValidate(value, _utils, config) {
    if (!config.taskProvider.ticketKeyPattern.test(value)) {
      return "Invalid ticket key format.";
    }
  },
};
