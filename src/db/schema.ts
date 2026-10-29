import { jsonb, pgTable, serial, text, timestamp, uniqueIndex, integer } from "drizzle-orm/pg-core";

/**
 * TikTok account — enforces SINGLE ACCOUNT constraint.
 *
 * Only one row should ever exist. Enforced by:
 * - Application layer: storeTokens() checks findFirst() before insert
 * - Unique index on tiktok_open_id prevents duplicate open_ids
 *
 * PostgreSQL does not natively support "at most one row" via schema constraints.
 * The application layer (TikTokTokenService.storeTokens) is the authoritative
 * single-account gatekeeper.
 */
export const tiktokAccount = pgTable(
  "tiktok_account",
  {
    id: serial("id").primaryKey(),
    tiktokOpenId: text("tiktok_open_id").notNull().unique(),
    displayName: text("display_name").notNull().default(""),
    avatarUrl: text("avatar_url").notNull().default(""),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").notNull().default(""),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("tiktok_open_id_idx").on(t.tiktokOpenId)],
);

export type TiktokAccount = typeof tiktokAccount.$inferSelect;
export type NewTiktokAccount = typeof tiktokAccount.$inferInsert;

// ─── TikTok Browser Account (Phase 1B) ─────────────────────

/**
 * TikTok Browser Account — persistent browser-based account.
 * SINGLE ACCOUNT model: only one row should ever exist.
 * Enforced by application layer (primary-account.ts).
 *
 * No OAuth tokens, no API credentials.
 * Only browser profile references and observed account data.
 */
export const tiktokBrowserAccount = pgTable(
  "tiktok_browser_account",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull().default("tiktok"),
    username: text("username"),
    displayName: text("display_name"),
    profileUrl: text("profile_url"),
    avatarUrl: text("avatar_url"),
    browserProfileId: text("browser_profile_id"),
    status: text("status").notNull().default("not_connected"),
    runtimeStatus: text("runtime_status").default("offline"),
    runtimeSource: text("runtime_source").default("local"),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type TiktokBrowserAccount = typeof tiktokBrowserAccount.$inferSelect;
export type NewTiktokBrowserAccount = typeof tiktokBrowserAccount.$inferInsert;

// ─── Browser Observation ────────────────────────────────────

/**
 * Browser Observation — records what the Agent observed via browser.
 * Each observation is a snapshot of visible data from TikTok.
 */
export const browserObservation = pgTable(
  "browser_observation",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    page: text("page").notNull(),
    category: text("category").notNull(),
    rawSummary: text("raw_summary"),
    structuredData: jsonb("structured_data"),
    importantFindings: jsonb("important_findings"),
    changesDetected: jsonb("changes_detected"),
    confidence: text("confidence").notNull().default("observed"),
    screenshotPath: text("screenshot_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type BrowserObservation = typeof browserObservation.$inferSelect;
export type NewBrowserObservation = typeof browserObservation.$inferInsert;

// ─── AI Memory ──────────────────────────────────────────────

/**
 * AI Memory — stores facts, decisions, results, and learnings.
 * Each entry is a structured, validated record. No chain-of-thought exposed.
 */
export const aiMemory = pgTable(
  "ai_memory",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", {
      enum: ["fact", "decision", "result", "learning"],
    })
      .notNull(),
    content: text("content").notNull(),
    source: text("source").notNull().default("system"),
    accountId: integer("account_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type AiMemory = typeof aiMemory.$inferSelect;
export type NewAiMemory = typeof aiMemory.$inferInsert;

// ─── Observations ───────────────────────────────────────────

/**
 * Observations — factual records of what the system has observed.
 */
export const aiObservations = pgTable(
  "ai_observations",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    source: text("source").notNull().default("system"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type AiObservation = typeof aiObservations.$inferSelect;
export type NewAiObservation = typeof aiObservations.$inferInsert;

// ─── Human Tasks ────────────────────────────────────────────

/**
 * Human Tasks — actions that require human intervention.
 * Created by the AI when an action cannot be performed automatically.
 */
export const humanTasks = pgTable(
  "human_tasks",
  {
    id: serial("id").primaryKey(),
    type: text("type", {
      enum: [
        "CHANGE_BIO",
        "PUBLISH_DRAFT",
        "CONNECT_TIKTOK_PERMISSION",
        "REAUTHORIZE_TIKTOK",
        "MANUAL_ACTION",
      ],
    })
      .notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
);

export type HumanTask = typeof humanTasks.$inferSelect;
export type NewHumanTask = typeof humanTasks.$inferInsert;

// ─── YouTube Account ───────────────────────────────────────

/**
 * YouTube account — enforces SINGLE ACCOUNT constraint.
 * Mirrors TikTok pattern: only one row should ever exist.
 */
export const youtubeAccount = pgTable(
  "youtube_account",
  {
    id: serial("id").primaryKey(),
    googleUserId: text("google_user_id").notNull().unique(),
    channelTitle: text("channel_title").notNull().default(""),
    channelThumbnail: text("channel_thumbnail").notNull().default(""),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").notNull().default(""),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("google_user_id_idx").on(t.googleUserId)],
);

export type YoutubeAccount = typeof youtubeAccount.$inferSelect;
export type NewYoutubeAccount = typeof youtubeAccount.$inferInsert;

// ─── Content Strategy ───────────────────────────────────────

/**
 * Content Strategy — the AI's current strategic approach.
 * Single row, updated as the AI refines its approach.
 */
export const contentStrategy = pgTable(
  "content_strategy",
  {
    id: serial("id").primaryKey(),
    objective: text("objective").notNull(),
    audience: text("audience"),
    pillars: jsonb("pillars"),
    formats: jsonb("formats"),
    tone: text("tone"),
    postingStrategy: text("posting_strategy"),
    experiments: jsonb("experiments"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type ContentStrategyRow = typeof contentStrategy.$inferSelect;
export type NewContentStrategy = typeof contentStrategy.$inferInsert;

// ─── Content Plans ──────────────────────────────────────────

/**
 * Content Plans — individual content ideas created by the AI.
 */
export const contentPlans = pgTable(
  "content_plans",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    concept: text("concept"),
    objective: text("objective"),
    contentPillar: text("content_pillar"),
    format: text("format"),
    hook: text("hook"),
    status: text("status", {
      enum: ["idea", "planned", "ready", "published", "cancelled"],
    })
      .notNull()
      .default("idea"),
    plannedFor: timestamp("planned_for", { withTimezone: true }),
    createdBy: text("created_by").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type ContentPlan = typeof contentPlans.$inferSelect;
export type NewContentPlan = typeof contentPlans.$inferInsert;

// ─── AI Activity Log ────────────────────────────────────────

/**
 * AI Activity — records of AI operations for the dashboard.
 */
export const aiActivity = pgTable(
  "ai_activity",
  {
    id: serial("id").primaryKey(),
    type: text("type", {
      enum: [
        "RESEARCH",
        "ANALYSIS",
        "DECISION",
        "TASK_CREATED",
        "RESULT_RECORDED",
        "LEARNING",
        "CYCLE_COMPLETED",
        "RUNTIME_STARTED",
        "RUNTIME_STOPPED",
        "BROWSER_CONNECTED",
        "BROWSER_DISCONNECTED",
        "TIKTOK_SESSION_VALID",
        "TIKTOK_SESSION_EXPIRED",
        "HUMAN_ACTION_REQUIRED",
        "OBSERVATION_STARTED",
        "OBSERVATION_COMPLETED",
        "AGENT_ANALYSIS_STARTED",
      ],
    })
      .notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type AiActivity = typeof aiActivity.$inferSelect;
export type NewAiActivity = typeof aiActivity.$inferInsert;
