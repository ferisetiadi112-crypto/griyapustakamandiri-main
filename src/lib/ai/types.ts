/**
 * AI Types — Core type definitions for the TikTok Growth Manager brain.
 *
 * All AI decisions pass through validated structured schemas.
 * The AI never executes arbitrary SQL or server code.
 */

// ─── AI Decision ────────────────────────────────────────────

export type AiAction =
  | "observe_account"
  | "analyze_capabilities"
  | "create_research"
  | "update_strategy"
  | "create_content_plan"
  | "create_human_task"
  | "record_learning"
  | "no_action";

export type AiPriority = "critical" | "high" | "medium" | "low";

export type AiDecision = {
  goal: string;
  reasoningSummary: string;
  priority: AiPriority;
  action: AiAction;
  confidence: number;
  requiresHuman: boolean;
  humanReason?: string;
  metadata?: Record<string, unknown>;
};

// ─── AI Context ─────────────────────────────────────────────

export type AiContext = {
  account: {
    status: string;
    displayName: string | null;
    connectedAt: string | null;
    scopes: string[];
    profile: {
      followerCount: number | null;
      videoCount: number | null;
      likesCount: number | null;
    };
  };
  capabilities: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  observations: Array<{
    type: string;
    data: unknown;
    createdAt: string;
  }>;
  memoryFacts: string[];
  memoryLearnings: string[];
  recentDecisions: string[];
  pendingHumanTasks: number;
  contentPlanCount: number;
};

// ─── AI Provider ────────────────────────────────────────────

export type AiProviderConfig = {
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
};

export type AiProviderResponse = {
  content: string;
  tokensUsed?: number;
};

export type AiProvider = {
  readonly name: string;
  readonly isAvailable: boolean;
  generateText(prompt: string): Promise<AiProviderResponse>;
};

// ─── Observation Types ──────────────────────────────────────

export type ObservationType =
  | "ACCOUNT_CONNECTED"
  | "PROFILE_UPDATED"
  | "VIDEO_DETECTED"
  | "VIDEO_PUBLISHED"
  | "VIDEO_PERFORMANCE_CHANGED"
  | "CAPABILITY_CHANGED"
  | "HUMAN_TASK_COMPLETED"
  | "HUMAN_TASK_FAILED";

// ─── Goal ───────────────────────────────────────────────────

export type GrowthGoal = {
  id: string;
  objective: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
};
