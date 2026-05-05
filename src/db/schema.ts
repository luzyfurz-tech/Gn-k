import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const targets = sqliteTable("targets", {
  id: text("id").primaryKey(),
  hostname: text("hostname").notNull(),
  ipRange: text("ip_range").notNull(),
  scopeNotes: text("scope_notes"),
  tags: text("tags"),
  createdAt: integer("created_at").default(Date.now()),
});

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  targetId: text("target_id").references(() => targets.id),
  toolName: text("tool_name").notNull(),
  status: text("status").notNull(), // queued/running/done/fail
  output: text("output"),
  createdAt: integer("created_at").default(Date.now()),
});

export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(),
  targetId: text("target_id").references(() => targets.id),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // info/low/med/high/crit
  affectedService: text("affected_service"),
  description: text("description"),
  remediation: text("remediation"),
  status: text("status").notNull(), // open/closed
  createdAt: integer("created_at").default(Date.now()),
});

export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  installed: integer("installed", { mode: "boolean" }).default(false),
  version: text("version"),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  goal: text("goal").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  startedAt: integer("started_at").default(Date.now()),
  endedAt: integer("ended_at"),
  summary: text("summary"),
  iterationCount: integer("iteration_count"),
});

export const agentSteps = sqliteTable("agent_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").references(() => agentRuns.id),
  idx: integer("idx").notNull(),
  kind: text("kind").notNull(), // plan/tool_call/tool_result/ask/done/error
  payload: text("payload"), // json
  createdAt: integer("created_at").default(Date.now()),
  durationMs: integer("duration_ms"),
});
