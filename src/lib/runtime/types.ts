/**
 * Runtime Types — Core type definitions for the AI Agent Runtime.
 *
 * The runtime is the engine that keeps the AI Agent working.
 * It manages browser sessions, observation scheduling, and state
 * across multiple possible sources (local, VPS, cloud, device).
 */

// ─── Runtime Source ──────────────────────────────────────

export type RuntimeSource = "local" | "vps" | "cloud" | "device";

// ─── Runtime Status ──────────────────────────────────────

export type RuntimeStatus =
  | "offline"
  | "starting"
  | "active"
  | "idle"
  | "session_expired"
  | "human_action_required"
  | "error";

// ─── Observation Target ──────────────────────────────────

export type ObservationTarget =
  | "profile"
  | "content"
  | "video_performance"
  | "analytics"
  | "comments"
  | "messages"
  | "notifications"
  | "studio"
  | "audience";

// ─── Observation Priority ────────────────────────────────

export type ObservationPriority = "high" | "medium" | "low";

// ─── Observation Schedule Entry ──────────────────────────

export type ObservationScheduleEntry = {
  target: ObservationTarget;
  priority: ObservationPriority;
  lastObservedAt: string | null;
  intervalMs: number;
  enabled: boolean;
};

// ─── Agent Runtime Interface ─────────────────────────────

export interface AgentRuntime {
  /** The source this runtime connects to */
  readonly source: RuntimeSource;

  /** Start the runtime */
  start(): Promise<void>;

  /** Stop the runtime */
  stop(): Promise<void>;

  /** Get the current runtime status */
  status(): Promise<RuntimeStatus>;

  /** Perform a heartbeat check */
  heartbeat(): Promise<HeartbeatResult>;

  /** Connect to the primary TikTok account browser session */
  connectPrimaryAccount(): Promise<void>;

  /** Run an observation cycle */
  observe(target?: ObservationTarget): Promise<unknown>;

  /** Execute an action through the browser */
  execute(action: unknown): Promise<unknown>;

  /** Get the last heartbeat result */
  getLastHeartbeat(): Promise<HeartbeatResult | null>;
}

// ─── Heartbeat Result ────────────────────────────────────

export type HeartbeatResult = {
  timestamp: string;
  browserAlive: boolean;
  tiktokSessionValid: boolean;
  status: RuntimeStatus;
  currentPage: string | null;
  error?: string;
};

// ─── Runtime State ───────────────────────────────────────

export type RuntimeState = {
  source: RuntimeSource;
  status: RuntimeStatus;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  lastObservationAt: string | null;
  sessionId: string | null;
  error: string | null;
  // Extended state (runtime only, not persisted)
  currentPhase: string | null;
  currentTask: string | null;
  nextTaskTarget: string | null;
  nextTaskRunAt: string | null;
};

// ─── Agent Context (Runtime-Enhanced) ────────────────────

export type AgentContext = {
  account: {
    id: number;
    username: string | null;
    displayName: string | null;
    profileUrl: string | null;
    status: string;
    browserProfileId: string | null;
  };
  runtime: {
    source: RuntimeSource;
    status: RuntimeStatus;
    lastHeartbeat: string | null;
  };
  observations: Array<{
    id: number;
    page: string;
    category: string;
    summary: string | null;
    confidence: string;
    observedAt: string;
  }>;
  memories: Array<{
    kind: string;
    content: string;
    source: string;
    createdAt: string;
  }>;
  changes: Array<{
    field: string;
    previous: unknown;
    current: unknown;
  }>;
  unknowns: string[];
};
