// Provide dummy env vars so provider factories don't throw when config is imported in tests
process.env.GITLAB_PRIVATE_TOKEN ??= "test-token";
process.env.GITLAB_API_URL ??= "https://gitlab.example.com/api/v4";
process.env.GITHUB_TOKEN ??= "test-token";
process.env.GITHUB_API_URL ??= "https://api.github.com";
process.env.JIRA_API_URL ??= "https://jira.example.com";
process.env.JIRA_USER_EMAIL ??= "test@example.com";
process.env.JIRA_API_TOKEN ??= "test-token";
