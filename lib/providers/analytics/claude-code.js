import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

/**
 * Creates a Claude Code analytics provider that parses JSONL session files.
 * @param {{ claudeDir?: string }} [opts]
 * @returns {import("../../types.js").AnalyticsProvider}
 */
export function createClaudeCodeAnalyzer(opts = {}) {
  const claudeDir = resolve(
    opts.claudeDir?.replace(/^~/, homedir()) || join(homedir(), ".claude"),
  );

  return {
    name: "claude-code",
    analyze: (options) => analyze(claudeDir, options),
  };
}

/**
 * @param {string} claudeDir
 * @param {import("../../types.js").AnalyticsOptions} options
 * @returns {Promise<import("../../types.js").AnalyticsResult>}
 */
async function analyze(claudeDir, options) {
  const { dateRange, groupBy, projectFilter } = options;
  const projectsDir = join(claudeDir, "projects");

  const rawSessions = loadSessions(projectsDir, dateRange, projectFilter);

  const tools = computeToolUsage(rawSessions);
  const sessions = buildSessionList(rawSessions);

  return {
    providerName: "claude-code",
    period: dateRange,
    totals: computeTotals(rawSessions),
    tools,
    projects: computeProjectBreakdown(rawSessions),
    sessions,
    timeSeries: buildTimeSeries(rawSessions, groupBy),
    models: computeModelUsage(rawSessions),
    subagents: computeSubagentUsage(rawSessions),
    skills: computeSkillUsage(rawSessions),
    health: computeHealth(sessions, tools),
  };
}

// ── Session loading ──

function loadSessions(projectsDir, dateRange, projectFilter) {
  if (!existsSync(projectsDir)) return [];

  const sessions = [];

  for (const subdir of safeReaddir(projectsDir)) {
    const dirPath = join(projectsDir, subdir);
    if (!statSync(dirPath).isDirectory()) continue;
    if (subdir === "subagents") continue;

    if (projectFilter?.length) {
      const matches = projectFilter.some((f) =>
        subdir.toLowerCase().includes(f.toLowerCase()),
      );
      if (!matches) continue;
    }

    for (const file of safeReaddir(dirPath).filter((f) => f.endsWith(".jsonl"))) {
      const sessionId = file.replace(".jsonl", "");
      const messages = parseJsonl(join(dirPath, file));
      if (messages.length === 0) continue;

      const filtered = filterByDateRange(messages, dateRange);
      if (filtered.length === 0) continue;

      // Load subagent JSONL files if they exist
      const subagentDir = join(dirPath, sessionId, "subagents");
      const subagentMessages = [];
      for (const sf of safeReaddir(subagentDir).filter((f) => f.endsWith(".jsonl"))) {
        const msgs = parseJsonl(join(subagentDir, sf));
        const filteredMsgs = filterByDateRange(msgs, dateRange);
        subagentMessages.push(...filteredMsgs);
      }

      sessions.push({
        id: sessionId,
        projectDir: subdir,
        messages: filtered,
        subagentMessages,
      });
    }
  }

  return sessions;
}

function parseJsonl(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const messages = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        messages.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
    return messages;
  } catch {
    return [];
  }
}

function filterByDateRange(messages, dateRange) {
  return messages.filter((m) => {
    if (!m.timestamp) return false;
    const t = new Date(m.timestamp);
    return t >= dateRange.from && t <= dateRange.to;
  });
}

function safeReaddir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ── Aggregation ──

function computeTotals(sessions) {
  let messageCount = 0;
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  let toolCalls = 0;

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      messageCount++;
      const usage = msg.message?.usage;
      if (usage) {
        tokens.input += usage.input_tokens || 0;
        tokens.output += usage.output_tokens || 0;
        tokens.cacheRead += usage.cache_read_input_tokens || 0;
        tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      }
      toolCalls += countToolUses(msg);
    }
  }

  return { sessions: sessions.length, messages: messageCount, tokens, toolCalls };
}

function computeToolUsage(sessions) {
  /** @type {Map<string, { calls: number, errors: number }>} */
  const toolMap = new Map();

  for (const session of sessions) {
    // Build a set of error tool_use_ids from user messages (tool_result with is_error)
    const errorIds = new Set();
    for (const msg of session.messages) {
      if (msg.type !== "user") continue;
      const content = msg.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === "tool_result" && block.is_error) {
          errorIds.add(block.tool_use_id);
        }
      }
    }

    // Count tool_use blocks from assistant messages
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      const content = msg.message?.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type === "tool_use") {
          const entry = toolMap.get(block.name) || { calls: 0, errors: 0 };
          entry.calls++;
          if (errorIds.has(block.id)) entry.errors++;
          toolMap.set(block.name, entry);
        }
      }
    }
  }

  return Array.from(toolMap.entries())
    .map(([name, { calls, errors }]) => ({
      name,
      calls,
      errors,
      errorRate: calls > 0 ? errors / calls : 0,
    }))
    .sort((a, b) => b.calls - a.calls);
}

function computeProjectBreakdown(sessions) {
  /** @type {Map<string, { path: string, sessions: number, messages: number, tokens: import("../../types.js").TokenBreakdown }>} */
  const projectMap = new Map();

  for (const session of sessions) {
    const key = session.projectDir;
    const entry = projectMap.get(key) || {
      path: key,
      sessions: 0,
      messages: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
    };

    entry.sessions++;
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      entry.messages++;
      const usage = msg.message?.usage;
      if (usage) {
        entry.tokens.input += usage.input_tokens || 0;
        entry.tokens.output += usage.output_tokens || 0;
        entry.tokens.cacheRead += usage.cache_read_input_tokens || 0;
        entry.tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      }
    }

    projectMap.set(key, entry);
  }

  return Array.from(projectMap.values()).sort((a, b) => b.sessions - a.sessions);
}

function computeModelUsage(sessions) {
  /** @type {Map<string, { sessions: Set<string>, messages: number, tokens: { input: number, output: number, cacheRead: number, cacheCreation: number } }>} */
  const modelMap = new Map();

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      const model = msg.message?.model || "unknown";
      const entry = modelMap.get(model) || {
        sessions: new Set(),
        messages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };

      entry.sessions.add(session.id);
      entry.messages++;
      const usage = msg.message?.usage;
      if (usage) {
        entry.tokens.input += usage.input_tokens || 0;
        entry.tokens.output += usage.output_tokens || 0;
        entry.tokens.cacheRead += usage.cache_read_input_tokens || 0;
        entry.tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      }
      modelMap.set(model, entry);
    }
  }

  return Array.from(modelMap.entries())
    .map(([model, entry]) => ({
      model,
      sessions: entry.sessions.size,
      messages: entry.messages,
      tokens: entry.tokens,
    }))
    .sort((a, b) => b.messages - a.messages);
}

function computeSubagentUsage(sessions) {
  /** @type {Map<string, { dispatches: number, tokens: { input: number, output: number, cacheRead: number, cacheCreation: number } }>} */
  const agentMap = new Map();

  for (const session of sessions) {
    // Count dispatches from Agent tool_use blocks in parent messages
    const dispatchTypes = new Map();
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      const content = msg.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "Agent") {
          const agentType = block.input?.subagent_type || "general-purpose";
          dispatchTypes.set(agentType, (dispatchTypes.get(agentType) || 0) + 1);
        }
      }
    }

    for (const [agentType, count] of dispatchTypes) {
      const entry = agentMap.get(agentType) || {
        dispatches: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };
      entry.dispatches += count;
      agentMap.set(agentType, entry);
    }

    // Aggregate tokens from subagent messages
    for (const msg of session.subagentMessages || []) {
      if (msg.type !== "assistant") continue;
      // Use agentId prefix or fallback; subagent messages don't carry subagent_type
      // so we attribute tokens to an "subagent" bucket
      const usage = msg.message?.usage;
      if (!usage) continue;
      // We can't reliably map subagent messages back to their type,
      // so add tokens to a general subagent total
      const entry = agentMap.get("__subagent_tokens") || {
        dispatches: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      };
      entry.tokens.input += usage.input_tokens || 0;
      entry.tokens.output += usage.output_tokens || 0;
      entry.tokens.cacheRead += usage.cache_read_input_tokens || 0;
      entry.tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      agentMap.set("__subagent_tokens", entry);
    }
  }

  // Distribute subagent tokens proportionally across agent types by dispatch count
  const subagentTokens = agentMap.get("__subagent_tokens");
  agentMap.delete("__subagent_tokens");
  if (subagentTokens) {
    const totalDispatches = Array.from(agentMap.values()).reduce((s, e) => s + e.dispatches, 0);
    if (totalDispatches > 0) {
      for (const entry of agentMap.values()) {
        const ratio = entry.dispatches / totalDispatches;
        entry.tokens.input += Math.round(subagentTokens.tokens.input * ratio);
        entry.tokens.output += Math.round(subagentTokens.tokens.output * ratio);
        entry.tokens.cacheRead += Math.round(subagentTokens.tokens.cacheRead * ratio);
        entry.tokens.cacheCreation += Math.round(subagentTokens.tokens.cacheCreation * ratio);
      }
    }
  }

  return Array.from(agentMap.entries())
    .map(([type, entry]) => ({
      type,
      dispatches: entry.dispatches,
      tokens: entry.tokens,
    }))
    .sort((a, b) => b.dispatches - a.dispatches);
}

function computeSkillUsage(sessions) {
  /** @type {Map<string, number>} */
  const skillMap = new Map();

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      const content = msg.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === "tool_use" && block.name === "Skill") {
          const skill = block.input?.skill || "unknown";
          skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
        }
      }
    }
  }

  return Array.from(skillMap.entries())
    .map(([name, invocations]) => ({ name, invocations }))
    .sort((a, b) => b.invocations - a.invocations);
}

function buildSessionList(sessions) {
  return sessions.map((session) => {
    const timestamps = session.messages
      .filter((m) => m.timestamp)
      .map((m) => new Date(m.timestamp));
    const startedAt = timestamps.length
      ? new Date(Math.min(...timestamps))
      : new Date();
    const endedAt = timestamps.length
      ? new Date(Math.max(...timestamps))
      : startedAt;
    const duration = (endedAt - startedAt) / 1000 / 60; // minutes

    let messages = 0;
    const tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    const toolCounts = new Map();
    let model = "unknown";

    for (const msg of session.messages) {
      if (msg.type !== "assistant") continue;
      messages++;
      model = msg.message?.model || model;
      const usage = msg.message?.usage;
      if (usage) {
        tokens.input += usage.input_tokens || 0;
        tokens.output += usage.output_tokens || 0;
        tokens.cacheRead += usage.cache_read_input_tokens || 0;
        tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      }
      for (const block of msg.message?.content || []) {
        if (block.type === "tool_use") {
          toolCounts.set(block.name, (toolCounts.get(block.name) || 0) + 1);
        }
      }
    }

    const topTools = Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      id: session.id,
      project: session.projectDir,
      startedAt,
      duration,
      messages,
      tokens,
      model,
      topTools,
    };
  });
}

function buildTimeSeries(sessions, groupBy) {
  const buckets = new Map();

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== "assistant" || !msg.timestamp) continue;

      const key = formatBucketKey(new Date(msg.timestamp), groupBy);
      const bucket = buckets.get(key) || {
        date: key,
        sessions: new Set(),
        messages: 0,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
        toolCalls: 0,
      };

      bucket.sessions.add(msg.sessionId || session.id);
      bucket.messages++;
      const usage = msg.message?.usage;
      if (usage) {
        bucket.tokens.input += usage.input_tokens || 0;
        bucket.tokens.output += usage.output_tokens || 0;
        bucket.tokens.cacheRead += usage.cache_read_input_tokens || 0;
        bucket.tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
      }
      bucket.toolCalls += countToolUses(msg);
      buckets.set(key, bucket);
    }
  }

  return Array.from(buckets.values())
    .map((b) => ({ ...b, sessions: b.sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeHealth(sessions, tools) {
  const totalCalls = tools.reduce((sum, t) => sum + t.calls, 0);
  const totalErrors = tools.reduce((sum, t) => sum + t.errors, 0);

  const avgDuration = sessions.length
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    : 0;
  const avgMessages = sessions.length
    ? sessions.reduce((sum, s) => sum + s.messages, 0) / sessions.length
    : 0;

  return {
    toolErrorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
    topFailingTools: tools
      .filter((t) => t.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 5)
      .map(({ name, errors, calls }) => ({ name, errors, total: calls })),
    avgSessionDuration: avgDuration,
    avgMessagesPerSession: avgMessages,
  };
}

// ── Helpers ──

function countToolUses(msg) {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return 0;
  return content.filter((b) => b.type === "tool_use").length;
}

function formatBucketKey(date, groupBy) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  if (groupBy === "day") return `${y}-${m}-${d}`;
  if (groupBy === "month") return `${y}-${m}`;

  // week: ISO week start (Monday)
  const day = date.getUTCDay();
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  const wy = monday.getUTCFullYear();
  const wm = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const wd = String(monday.getUTCDate()).padStart(2, "0");
  return `${wy}-${wm}-${wd}`;
}
