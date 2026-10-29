/**
 * AI Brain — Central Orchestration Service
 *
 * Implements the core AI decision loop:
 *   observe() → buildContext() → decide() → validate() → execute() → recordResult()
 *
 * The AI never directly executes arbitrary SQL or server code.
 * All actions pass through validated structured schemas.
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  aiMemory,
  aiObservations,
  aiActivity,
  humanTasks,
  contentStrategy,
  contentPlans,
} from "@/db/schema";
import { getAiProvider, isAiConfigured } from "./provider";
import { buildDecisionPrompt } from "./prompts";
import type { AiDecision, AiContext, ObservationType } from "./types";
import { discoverCapabilities } from "@/lib/tiktok-capabilities";
import { getAccountState } from "@/lib/tiktok-account-service";

// ─── Observation System ─────────────────────────────────────

/**
 * Record a factual observation.
 * Only factual observations are stored — never invented ones.
 */
export async function recordObservation(
  type: ObservationType,
  data: Record<string, unknown>,
  source: string = "system",
): Promise<void> {
  const db = getDatabase();
  await db.insert(aiObservations).values({
    type,
    source,
    data,
  });
}

/**
 * Get recent observations.
 */
export async function getRecentObservations(limit: number = 20) {
  const db = getDatabase();
  return db.query.aiObservations.findMany({
    orderBy: desc(aiObservations.createdAt),
    limit,
  });
}

// ─── AI Memory ──────────────────────────────────────────────

/**
 * Store a fact in AI memory.
 */
export async function storeFact(content: string, source: string = "ai"): Promise<void> {
  const db = getDatabase();
  await db.insert(aiMemory).values({
    kind: "fact",
    content,
    source,
  });
}

/**
 * Store a decision in AI memory.
 */
export async function storeDecision(content: string, source: string = "ai"): Promise<void> {
  const db = getDatabase();
  await db.insert(aiMemory).values({
    kind: "decision",
    content,
    source,
  });
}

/**
 * Store a result in AI memory.
 */
export async function storeResult(content: string, source: string = "ai"): Promise<void> {
  const db = getDatabase();
  await db.insert(aiMemory).values({
    kind: "result",
    content,
    source,
  });
}

/**
 * Store a learning in AI memory. Requires evidence — never fabricated.
 */
export async function storeLearning(content: string, source: string = "ai"): Promise<void> {
  const db = getDatabase();
  await db.insert(aiMemory).values({
    kind: "learning",
    content,
    source,
  });
}

/**
 * Get recent memories by kind.
 */
export async function getMemoryByKind(
  kind: "fact" | "decision" | "result" | "learning",
  limit: number = 10,
) {
  const db = getDatabase();
  return db.query.aiMemory.findMany({
    where: eq(aiMemory.kind, kind),
    orderBy: desc(aiMemory.createdAt),
    limit,
  });
}

// ─── Human Tasks ────────────────────────────────────────────

export type HumanTaskType =
  | "CHANGE_BIO"
  | "PUBLISH_DRAFT"
  | "CONNECT_TIKTOK_PERMISSION"
  | "REAUTHORIZE_TIKTOK"
  | "MANUAL_ACTION";

/**
 * Create a human task when the AI cannot perform an action.
 * Tasks must be specific, actionable, and minimal.
 */
export async function createHumanTask(
  type: HumanTaskType,
  title: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const db = getDatabase();
  await db.insert(humanTasks).values({
    type,
    title,
    description,
    metadata: metadata ?? null,
  });

  // Also record the task creation as an AI activity
  await db.insert(aiActivity).values({
    type: "TASK_CREATED",
    summary: `Created human task: ${title}`,
    metadata: { taskType: type },
  });
}

/**
 * Get all pending human tasks.
 */
export async function getPendingHumanTasks() {
  const db = getDatabase();
  return db.query.humanTasks.findMany({
    where: eq(humanTasks.status, "pending"),
    orderBy: desc(humanTasks.createdAt),
  });
}

/**
 * Complete a human task.
 */
export async function completeHumanTask(taskId: number): Promise<void> {
  const db = getDatabase();
  await db
    .update(humanTasks)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(humanTasks.id, taskId));
}

// ─── AI Activity ────────────────────────────────────────────

/**
 * Record an AI activity event for the dashboard.
 */
export async function recordAiActivity(
  type: "RESEARCH" | "ANALYSIS" | "DECISION" | "TASK_CREATED" | "RESULT_RECORDED" | "LEARNING" | "CYCLE_COMPLETED",
  summary: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const db = getDatabase();
  await db.insert(aiActivity).values({
    type,
    summary,
    metadata: metadata ?? null,
  });
}

/**
 * Get recent AI activity for the dashboard.
 */
export async function getRecentAiActivity(limit: number = 10) {
  const db = getDatabase();
  return db.query.aiActivity.findMany({
    orderBy: desc(aiActivity.createdAt),
    limit,
  });
}

// ─── Context Building ───────────────────────────────────────

/**
 * Build the AI context from current system state.
 * This is the structured context the AI receives for decision-making.
 */
async function buildContext(): Promise<AiContext> {
  // Get account state
  const accountState = await getAccountState();

  // Get capabilities
  const capReport = await discoverCapabilities();

  // Get recent observations
  const observations = await getRecentObservations(10);

  // Get memory facts and learnings
  const facts = await getMemoryByKind("fact", 5);
  const learnings = await getMemoryByKind("learning", 5);
  const decisions = await getMemoryByKind("decision", 3);

  // Get pending human tasks count
  const pendingTasks = await getPendingHumanTasks();

  // Get content plan count
  const db = getDatabase();
  const plans = await db.query.contentPlans.findMany();

  return {
    account: {
      status: accountState.status,
      displayName: accountState.displayName,
      connectedAt: accountState.connectedAt,
      scopes: accountState.scopes,
      profile: {
        followerCount: accountState.profile.followerCount,
        videoCount: accountState.profile.videoCount,
        likesCount: accountState.profile.likesCount,
      },
    },
    capabilities: capReport.capabilities.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
    })),
    observations: observations.map((o) => ({
      type: o.type,
      data: o.data,
      createdAt: o.createdAt.toISOString(),
    })),
    memoryFacts: facts.map((f) => f.content),
    memoryLearnings: learnings.map((l) => l.content),
    recentDecisions: decisions.map((d) => d.content),
    pendingHumanTasks: pendingTasks.length,
    contentPlanCount: plans.length,
  };
}

// ─── Decision Validation ────────────────────────────────────

/**
 * Validate an AI decision against safety rules.
 * Ensures the AI does not attempt actions it cannot perform.
 */
function validateDecision(decision: AiDecision): AiDecision {
  // If the AI wants to execute an action, check if it's safe
  const dangerousActions = [
    "execute_tiktok_post",
    "execute_tiktok_like",
    "execute_tiktok_comment",
    "execute_tiktok_dm",
    "execute_tiktok_bio_change",
  ];

  // If AI somehow returns a dangerous action, force it to human task
  if (decision.metadata && typeof decision.metadata["action"] === "string") {
    const action = decision.metadata["action"] as string;
    if (dangerousActions.includes(action)) {
      decision.requiresHuman = true;
      decision.humanReason = `AI attempted action "${action}" which requires human intervention.`;
      decision.action = "create_human_task";
    }
  }

  // Ensure confidence is within bounds
  if (decision.confidence < 0) decision.confidence = 0;
  if (decision.confidence > 1) decision.confidence = 1;

  // Ensure required fields exist
  if (!decision.goal) decision.goal = "Grow TikTok account";
  if (!decision.reasoningSummary) decision.reasoningSummary = "No reasoning provided";
  if (!decision.priority) decision.priority = "medium";
  if (!decision.action) decision.action = "no_action";

  return decision;
}

// ─── AI Cycle Execution ─────────────────────────────────────

/**
 * Execute an action based on the AI decision.
 * Only safe, read-only actions are executed automatically.
 * Everything else becomes a human task.
 */
async function executeDecision(decision: AiDecision): Promise<void> {
  switch (decision.action) {
    case "observe_account": {
      const state = await getAccountState();
      await recordObservation("PROFILE_UPDATED", {
        displayName: state.displayName,
        followerCount: state.profile.followerCount,
        videoCount: state.profile.videoCount,
        status: state.status,
      });
      await storeFact(`Account ${state.displayName ?? "unknown"}: ${state.profile.videoCount ?? 0} videos, ${state.profile.followerCount ?? 0} followers`);
      break;
    }

    case "analyze_capabilities": {
      const caps = await discoverCapabilities();
      const available = caps.capabilities.filter((c) => c.status === "available");
      const missing = caps.capabilities.filter((c) => c.status === "requires_permission");
      await storeFact(
        `Capabilities: ${available.length} available, ${missing.length} need permission`,
      );
      break;
    }

    case "create_human_task": {
      const title = decision.humanReason ?? "Action required";
      await createHumanTask(
        "MANUAL_ACTION",
        title,
        decision.reasoningSummary,
        decision.metadata,
      );
      break;
    }

    case "create_content_plan": {
      // Record the intention but don't create a plan yet (needs more context)
      await storeFact("AI recommends creating content plans. Implementation pending.");
      break;
    }

    case "update_strategy": {
      await storeFact("AI recommends strategy update. Implementation pending.");
      break;
    }

    case "record_learning": {
      if (decision.metadata && typeof decision.metadata["learning"] === "string") {
        await storeLearning(decision.metadata["learning"] as string);
      }
      break;
    }

    case "no_action":
    default:
      break;
  }
}

// ─── Main AI Cycle ──────────────────────────────────────────

/**
 * Run a single AI cycle.
 *
 * This is the core orchestration function. It:
 * 1. Observes the current state
 * 2. Builds structured context
 * 3. Asks the AI for a decision
 * 4. Validates the decision
 * 5. Executes safe actions or creates human tasks
 * 6. Records the result
 *
 * Must be explicitly called — no automatic loops.
 */
export async function runAiCycle(): Promise<{
  decision: AiDecision;
  executed: boolean;
  error?: string;
}> {
  // Check if AI is configured
  if (!isAiConfigured()) {
    return {
      decision: {
        goal: "AI provider not configured",
        reasoningSummary: "No AI API key configured. Set AI_API_KEY or OPENAI_API_KEY.",
        priority: "medium",
        action: "no_action",
        confidence: 0,
        requiresHuman: false,
      },
      executed: false,
      error: "AI provider not configured",
    };
  }

  try {
    // 1. Build context
    const context = await buildContext();

    // 2. Build prompt and get AI decision
    const prompt = buildDecisionPrompt(context);
    const provider = getAiProvider();
    const response = await provider.generateText(prompt);

    // 3. Parse the AI response
    let decision: AiDecision;
    try {
      // Try to extract JSON from the response (may be wrapped in markdown)
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      decision = JSON.parse(jsonStr) as AiDecision;
    } catch {
      // If parsing fails, create a fallback decision
      decision = {
        goal: "Grow TikTok account",
        reasoningSummary: "AI response could not be parsed as structured decision.",
        priority: "medium",
        action: "no_action",
        confidence: 0.1,
        requiresHuman: false,
      };
    }

    // 4. Validate the decision
    decision = validateDecision(decision);

    // 5. Execute
    await executeDecision(decision);

    // 6. Record the decision
    await storeDecision(
      `[${decision.priority}] ${decision.action}: ${decision.reasoningSummary}`,
    );

    // 7. Record activity
    await recordAiActivity("DECISION", decision.reasoningSummary, {
      action: decision.action,
      priority: decision.priority,
      confidence: decision.confidence,
      requiresHuman: decision.requiresHuman,
    });

    // 8. Record cycle completion
    await recordAiActivity("CYCLE_COMPLETED", `AI cycle completed. Action: ${decision.action}`);

    return {
      decision,
      executed: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    await recordAiActivity("ANALYSIS", `AI cycle failed: ${errorMsg}`);
    return {
      decision: {
        goal: "Error in AI cycle",
        reasoningSummary: `AI cycle failed: ${errorMsg}`,
        priority: "low",
        action: "no_action",
        confidence: 0,
        requiresHuman: false,
      },
      executed: false,
      error: errorMsg,
    };
  }
}
