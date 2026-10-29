/**
 * AI Prompts — structured prompts for the TikTok Growth Manager brain.
 *
 * Each prompt produces a structured JSON response matching the AiDecision schema.
 * The prompts are designed to produce valid, parseable output.
 */

import type { AiContext } from "./types";

/**
 * Build the main decision prompt from the current AI context.
 * Returns a string that, when fed to the AI, produces a valid AiDecision JSON.
 */
export function buildDecisionPrompt(context: AiContext): string {
  const capabilitySummary = context.capabilities
    .map((c) => `  - ${c.id}: ${c.status}`)
    .join("\n");

  const factsSummary =
    context.memoryFacts.length > 0
      ? context.memoryFacts.map((f) => `  - ${f}`).join("\n")
      : "  (no facts recorded yet)";

  const learningsSummary =
    context.memoryLearnings.length > 0
      ? context.memoryLearnings.map((l) => `  - ${l}`).join("\n")
      : "  (no learnings recorded yet)";

  const recentDecisionsSummary =
    context.recentDecisions.length > 0
      ? context.recentDecisions.map((d) => `  - ${d}`).join("\n")
      : "  (no recent decisions)";

  return `You are a TikTok Growth Manager AI managing ONE TikTok account from zero.

CURRENT ACCOUNT STATE:
- Status: ${context.account.status}
- Display Name: ${context.account.displayName ?? "unknown"}
- Connected: ${context.account.connectedAt ?? "not connected"}
- Scopes: ${context.account.scopes.join(", ") || "none"}
- Followers: ${context.account.profile.followerCount ?? "unknown"}
- Videos: ${context.account.profile.videoCount ?? "unknown"}
- Likes: ${context.account.profile.likesCount ?? "unknown"}

CAPABILITIES:
${capabilitySummary}

KNOWN FACTS:
${factsSummary}

LEARNINGS:
${learningsSummary}

RECENT DECISIONS:
${recentDecisionsSummary}

PENDING HUMAN TASKS: ${context.pendingHumanTasks}
EXISTING CONTENT PLANS: ${context.contentPlanCount}

TASK: Decide the single best next action. Consider:
1. What is the current state of the account?
2. What is the current growth objective?
3. What should we do next?
4. Can the system perform it automatically?
5. If not, what should a human do?

RULES:
- Only recommend actions the system can actually perform based on capabilities.
- If an action requires human intervention, set requires_human: true and explain why.
- Do NOT fabricate data you don't have.
- Do NOT claim capabilities that are "not_implemented" or "requires_permission" are available.
- Focus on the single most impactful next step.

Respond with ONLY a JSON object matching this schema:
{
  "goal": "string - the current growth objective",
  "reasoning_summary": "string - brief explanation of why this action",
  "priority": "critical|high|medium|low",
  "action": "observe_account|analyze_capabilities|create_research|update_strategy|create_content_plan|create_human_task|record_learning|no_action",
  "confidence": 0.0-1.0,
  "requires_human": boolean,
  "human_reason": "string or null - if requires_human, explain what the human needs to do",
  "metadata": {} or null
}`;
}
