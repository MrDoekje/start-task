import * as p from "@clack/prompts";

/** @type {import("../../types.js").WizardStep} */
const timeRangeStep = {
  type: "select",
  key: "timeRange",
  message: "Time range:",
  options: [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
  ],
};

/** @type {import("../../types.js").WizardStep} */
const groupByStep = {
  type: "select",
  key: "groupBy",
  message: "Group by:",
  options: [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ],
};

/** @type {import("../../types.js").WizardStep} */
const reportSectionsStep = {
  type: "multiselect",
  key: "reportSections",
  message: "Report sections:",
  required: true,
  options: [
    { value: "tools", label: "Tool usage" },
    { value: "subagents", label: "Subagent usage" },
    { value: "skills", label: "Skill usage" },
    { value: "models", label: "Model usage" },
    { value: "sessions", label: "Session patterns" },
    { value: "projects", label: "Project breakdown" },
    { value: "tokens", label: "Token usage" },
    { value: "health", label: "Health & errors" },
  ],
};

/**
 * @param {Record<string, unknown>} results
 * @param {import("../../types.js").Config} config
 */
export async function analyticsAction(results, config) {
  const providers = normalizeProviders(config.analytics);
  if (providers.length === 0) {
    throw new Error(
      'No analytics provider configured. Add "analytics: createClaudeCodeAnalyzer()" to your config.',
    );
  }

  const days = parseInt(results.timeRange, 10);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const options = {
    dateRange: { from, to },
    groupBy: results.groupBy,
    projectFilter: results.projectFilter,
  };

  const filtered = results.agentFilter
    ? providers.filter((prov) => results.agentFilter.includes(prov.name))
    : providers;

  const allResults = await Promise.all(
    filtered.map((prov) => prov.analyze(options)),
  );
  const merged = mergeResults(allResults);
  const sections = new Set(results.reportSections);

  printReport(merged, sections, filtered.length > 1 ? allResults : null);
}

/** @type {import("../../types.js").FlowConfig} */
export const analyticsFlow = {
  label: "Analytics",
  steps: [timeRangeStep, groupByStep, reportSectionsStep],
  action: async (results, config) => {
    const providers = normalizeProviders(config.analytics);

    // Prompt for agent filter when multiple providers are configured
    if (providers.length > 1) {
      const selected = await p.multiselect({
        message: "Which agents to include?",
        options: providers.map((prov) => ({ value: prov.name, label: prov.name })),
        required: true,
      });
      if (!p.isCancel(selected)) {
        results.agentFilter = selected;
      }
    }

    await analyticsAction(results, config);
  },
  overrides: false,
};

// ── Helpers ──

function normalizeProviders(analytics) {
  if (!analytics) return [];
  return Array.isArray(analytics) ? analytics : [analytics];
}

function mergeResults(results) {
  if (results.length === 1) return results[0];

  const toolMap = new Map();
  const subagentMap = new Map();
  const skillMap = new Map();
  const modelMap = new Map();
  const projectMap = new Map();
  const timeMap = new Map();
  const allSessions = [];

  const merged = {
    providerName: results.map((r) => r.providerName).join(" + "),
    period: results[0].period,
    totals: {
      sessions: 0,
      messages: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      toolCalls: 0,
    },
    tools: [],
    subagents: [],
    skills: [],
    models: [],
    projects: [],
    sessions: [],
    timeSeries: [],
    health: {
      toolErrorRate: 0,
      topFailingTools: [],
      avgSessionDuration: 0,
      avgMessagesPerSession: 0,
    },
  };

  for (const result of results) {
    merged.totals.sessions += result.totals.sessions;
    merged.totals.messages += result.totals.messages;
    merged.totals.tokens.input += result.totals.tokens.input;
    merged.totals.tokens.output += result.totals.tokens.output;
    merged.totals.tokens.cacheRead += result.totals.tokens.cacheRead;
    merged.totals.tokens.cacheCreation += result.totals.tokens.cacheCreation;
    merged.totals.toolCalls += result.totals.toolCalls;

    for (const tool of result.tools) {
      const existing = toolMap.get(tool.name) || { calls: 0, errors: 0 };
      existing.calls += tool.calls;
      existing.errors += tool.errors;
      toolMap.set(tool.name, existing);
    }

    for (const sa of result.subagents || []) {
      const existing = subagentMap.get(sa.type) || {
        type: sa.type,
        dispatches: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };
      existing.dispatches += sa.dispatches;
      existing.tokens.input += sa.tokens.input;
      existing.tokens.output += sa.tokens.output;
      existing.tokens.cacheRead += sa.tokens.cacheRead;
      existing.tokens.cacheCreation += sa.tokens.cacheCreation;
      subagentMap.set(sa.type, existing);
    }

    for (const sk of result.skills || []) {
      skillMap.set(sk.name, (skillMap.get(sk.name) || 0) + sk.invocations);
    }

    for (const model of result.models || []) {
      const existing = modelMap.get(model.model) || {
        model: model.model,
        sessions: 0,
        messages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };
      existing.sessions += model.sessions;
      existing.messages += model.messages;
      existing.tokens.input += model.tokens.input;
      existing.tokens.output += model.tokens.output;
      existing.tokens.cacheRead += model.tokens.cacheRead;
      existing.tokens.cacheCreation += model.tokens.cacheCreation;
      modelMap.set(model.model, existing);
    }

    for (const proj of result.projects) {
      const existing = projectMap.get(proj.path) || {
        path: proj.path,
        sessions: 0,
        messages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };
      existing.sessions += proj.sessions;
      existing.messages += proj.messages;
      existing.tokens.input += proj.tokens.input;
      existing.tokens.output += proj.tokens.output;
      existing.tokens.cacheRead += proj.tokens.cacheRead;
      existing.tokens.cacheCreation += proj.tokens.cacheCreation;
      projectMap.set(proj.path, existing);
    }

    allSessions.push(...result.sessions);

    for (const ts of result.timeSeries) {
      const existing = timeMap.get(ts.date) || {
        date: ts.date,
        sessions: 0,
        messages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
        toolCalls: 0,
      };
      existing.sessions += ts.sessions;
      existing.messages += ts.messages;
      existing.tokens.input += ts.tokens.input;
      existing.tokens.output += ts.tokens.output;
      existing.tokens.cacheRead += ts.tokens.cacheRead;
      existing.tokens.cacheCreation += ts.tokens.cacheCreation;
      existing.toolCalls += ts.toolCalls;
      timeMap.set(ts.date, existing);
    }
  }

  merged.tools = Array.from(toolMap.entries())
    .map(([name, { calls, errors }]) => ({
      name,
      calls,
      errors,
      errorRate: calls > 0 ? errors / calls : 0,
    }))
    .sort((a, b) => b.calls - a.calls);

  merged.subagents = Array.from(subagentMap.values()).sort(
    (a, b) => b.dispatches - a.dispatches,
  );
  merged.skills = Array.from(skillMap.entries())
    .map(([name, invocations]) => ({ name, invocations }))
    .sort((a, b) => b.invocations - a.invocations);
  merged.models = Array.from(modelMap.values()).sort(
    (a, b) => b.messages - a.messages,
  );
  merged.projects = Array.from(projectMap.values()).sort(
    (a, b) => b.sessions - a.sessions,
  );
  merged.sessions = allSessions;
  merged.timeSeries = Array.from(timeMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const totalCalls = merged.tools.reduce((s, t) => s + t.calls, 0);
  const totalErrors = merged.tools.reduce((s, t) => s + t.errors, 0);
  merged.health = {
    toolErrorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
    topFailingTools: merged.tools
      .filter((t) => t.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 5)
      .map(({ name, errors, calls }) => ({ name, errors, total: calls })),
    avgSessionDuration: allSessions.length
      ? allSessions.reduce((s, sess) => s + sess.duration, 0) /
        allSessions.length
      : 0,
    avgMessagesPerSession: allSessions.length
      ? allSessions.reduce((s, sess) => s + sess.messages, 0) /
        allSessions.length
      : 0,
  };

  return merged;
}

// ── Report rendering ──

function printReport(result, sections, perAgentResults) {
  console.log("");

  const from = result.period.from.toISOString().slice(0, 10);
  const to = result.period.to.toISOString().slice(0, 10);
  p.log.info(`Period: ${from} to ${to} | ${result.providerName}`);

  if (perAgentResults) {
    const lines = perAgentResults.map(
      (r) =>
        `  ${r.providerName}: ${r.totals.sessions} sessions, ${formatTokens(totalTokenCount(r.totals.tokens))} tokens`,
    );
    p.note(lines.join("\n"), "Per-agent summary");
  }

  if (sections.has("tokens")) {
    const t = result.totals;
    const total = totalTokenCount(t.tokens);
    const lines = [
      `Sessions: ${t.sessions}  |  Messages: ${t.messages}  |  Tool calls: ${t.toolCalls}`,
      `Tokens: ${formatTokens(total)} total`,
      `  Input: ${formatTokens(t.tokens.input)}  |  Output: ${formatTokens(t.tokens.output)}`,
      `  Cache read: ${formatTokens(t.tokens.cacheRead)}  |  Cache write: ${formatTokens(t.tokens.cacheCreation)}`,
    ];

    if (result.timeSeries.length > 0) {
      lines.push("");
      lines.push(
        miniChart(result.timeSeries, (d) => totalTokenCount(d.tokens)),
      );
    }

    p.note(lines.join("\n"), "Token usage");
  }

  if (sections.has("tools")) {
    if (result.tools.length === 0) {
      p.note("No tool usage found.", "Tool usage");
    } else {
      const top = result.tools.slice(0, 20);
      const maxName = Math.max(...top.map((t) => t.name.length), 4);
      const header = `${"Tool".padEnd(maxName)}  ${"Calls".padStart(6)}  ${"Errors".padStart(6)}  Error%`;
      const rows = top.map((t) => {
        const pct = (t.errorRate * 100).toFixed(1) + "%";
        return `${t.name.padEnd(maxName)}  ${String(t.calls).padStart(6)}  ${String(t.errors).padStart(6)}  ${pct.padStart(6)}`;
      });
      p.note(
        [header, "─".repeat(header.length), ...rows].join("\n"),
        "Tool usage (top 20)",
      );
    }
  }

  if (sections.has("subagents")) {
    if (!result.subagents || result.subagents.length === 0) {
      p.note("No subagent usage found.", "Subagent usage");
    } else {
      const maxType = Math.max(
        ...result.subagents.map((s) => s.type.length),
        4,
      );
      const header = `${"Type".padEnd(maxType)}  ${"Dispatches".padStart(10)}  ${"Tokens".padStart(10)}`;
      const rows = result.subagents.map((s) => {
        const tok = formatTokens(totalTokenCount(s.tokens));
        return `${s.type.padEnd(maxType)}  ${String(s.dispatches).padStart(10)}  ${tok.padStart(10)}`;
      });
      p.note(
        [header, "─".repeat(header.length), ...rows].join("\n"),
        "Subagent usage",
      );
    }
  }

  if (sections.has("skills")) {
    if (!result.skills || result.skills.length === 0) {
      p.note("No skill usage found.", "Skill usage");
    } else {
      const maxName = Math.max(
        ...result.skills.map((s) => s.name.length),
        5,
      );
      const header = `${"Skill".padEnd(maxName)}  ${"Invocations".padStart(11)}`;
      const rows = result.skills.map((s) =>
        `${s.name.padEnd(maxName)}  ${String(s.invocations).padStart(11)}`,
      );
      p.note(
        [header, "─".repeat(header.length), ...rows].join("\n"),
        "Skill usage",
      );
    }
  }

  if (sections.has("models")) {
    if (!result.models || result.models.length === 0) {
      p.note("No model data found.", "Model usage");
    } else {
      const maxModel = Math.max(
        ...result.models.map((m) => m.model.length),
        5,
      );
      const header = `${"Model".padEnd(maxModel)}  ${"Sessions".padStart(8)}  ${"Messages".padStart(8)}  ${"Tokens".padStart(10)}`;
      const rows = result.models.map((m) => {
        const tok = formatTokens(totalTokenCount(m.tokens));
        return `${m.model.padEnd(maxModel)}  ${String(m.sessions).padStart(8)}  ${String(m.messages).padStart(8)}  ${tok.padStart(10)}`;
      });
      p.note(
        [header, "─".repeat(header.length), ...rows].join("\n"),
        "Model usage",
      );
    }
  }

  if (sections.has("projects")) {
    if (result.projects.length === 0) {
      p.note("No project data found.", "Project breakdown");
    } else {
      const maxPath = Math.max(
        ...result.projects.map((pr) => pr.path.length),
        7,
      );
      const header = `${"Project".padEnd(maxPath)}  ${"Sessions".padStart(8)}  ${"Messages".padStart(8)}  ${"Tokens".padStart(10)}`;
      const rows = result.projects.map((pr) => {
        const tok = formatTokens(totalTokenCount(pr.tokens));
        return `${pr.path.padEnd(maxPath)}  ${String(pr.sessions).padStart(8)}  ${String(pr.messages).padStart(8)}  ${tok.padStart(10)}`;
      });
      p.note(
        [header, "─".repeat(header.length), ...rows].join("\n"),
        "Project breakdown",
      );
    }
  }

  if (sections.has("sessions")) {
    const sorted = [...result.sessions].sort((a, b) => b.duration - a.duration);
    const top = sorted.slice(0, 10);
    if (top.length === 0) {
      p.note("No sessions found.", "Session patterns");
    } else {
      const avg = result.health.avgSessionDuration;
      const avgMsg = result.health.avgMessagesPerSession;
      const summary = `Avg duration: ${avg.toFixed(1)} min  |  Avg messages: ${avgMsg.toFixed(1)}`;
      const rows = top.map((s) => {
        const dur = s.duration.toFixed(0) + " min";
        const tools = s.topTools.slice(0, 3).join(", ") || "none";
        return `  ${s.project.slice(0, 30).padEnd(30)}  ${dur.padStart(8)}  ${String(s.messages).padStart(4)} msgs  ${s.model.padEnd(20)}  [${tools}]`;
      });
      p.note(
        [summary, "", "Longest sessions:", ...rows].join("\n"),
        "Session patterns",
      );
    }
  }

  if (sections.has("health")) {
    const h = result.health;
    const lines = [
      `Overall tool error rate: ${(h.toolErrorRate * 100).toFixed(1)}%`,
    ];
    if (h.topFailingTools.length > 0) {
      lines.push("");
      lines.push("Top failing tools:");
      for (const t of h.topFailingTools) {
        lines.push(
          `  ${t.name}: ${t.errors}/${t.total} calls failed (${((t.errors / t.total) * 100).toFixed(1)}%)`,
        );
      }
    } else {
      lines.push("No tool errors found.");
    }
    p.note(lines.join("\n"), "Health & errors");
  }
}

function totalTokenCount(tokens) {
  return tokens.input + tokens.output + tokens.cacheRead + tokens.cacheCreation;
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function miniChart(timeSeries, valueFn) {
  const bars = "▁▂▃▄▅▆▇█";
  const values = timeSeries.map(valueFn);
  const max = Math.max(...values, 1);
  const chart = values.map(
    (v) => bars[Math.min(Math.floor((v / max) * (bars.length - 1)), bars.length - 1)],
  );
  const first = timeSeries[0].date;
  const last = timeSeries[timeSeries.length - 1].date;
  return `${first} ${chart.join("")} ${last}`;
}
