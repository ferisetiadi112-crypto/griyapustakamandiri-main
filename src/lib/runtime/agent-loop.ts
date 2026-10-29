/**
 * Agent Loop — Persistent Observation Cycle
 *
 * The agent loop is the continuous work cycle that keeps the AI Agent running.
 * It coordinates:
 *   scheduler → observer → analysis → memory → scheduler
 *
 * The loop runs independently of the dashboard. The dashboard only monitors
 * and controls the loop.
 *
 * Loop flow:
 *   START → RESTORE_BROWSER → CHECK_SESSION → ACTIVE
 *   ACTIVE → HEARTBEAT → SCHEDULER → OBSERVE → ANALYZE → MEMORY → WAIT → LOOP
 *   SESSION_EXPIRED → HUMAN_ACTION_REQUIRED → WAIT → CHECK → LOOP
 *   ERROR → RECOVER → LOOP
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  tiktokBrowserAccount,
  browserObservation,
  aiMemory,
  aiActivity,
} from "@/db/schema";
import { getBrowserProvider } from "@/lib/browser";
import { buildObservationReport } from "@/lib/agent/report";
import { computeDiff } from "@/lib/agent/diff";
import type { ObservationReport } from "@/lib/agent/report";
import {
  getNextTarget,
  markObserved,
  loadLastObservations,
  getSchedule,
} from "./scheduler";
import * as state from "./state";
import type {
  RuntimeSource,
  ObservationTarget,
  HeartbeatResult,
} from "./types";

// ─── Constants ───────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;       // 30 seconds
const LOOP_IDLE_DELAY_MS = 5_000;            // 5 seconds between loops when idle
const OBSERVATION_WAIT_MS = 2_000;           // 2 seconds page load wait
const RETRY_BASE_DELAY_MS = 10_000;          // 10 seconds base retry delay
const RETRY_MAX_DELAY_MS = 120_000;          // 2 minutes max retry delay
const RETRY_MAX_ATTEMPTS = 5;                // max consecutive retries
const HUMAN_ACTION_POLL_MS = 10_000;         // 10 seconds polling for human action resolution
const MAX_HUMAN_ACTION_WAIT_MS = 30 * 60 * 1000; // 30 minutes max wait

// ─── Runtime Lock ────────────────────────────────────────

let runtimeLock = false;
let loopAbortController: AbortController | null = null;

/**
 * Try to acquire the runtime lock.
 * Returns true if acquired, false if another runtime is active.
 */
export function tryAcquireLock(): boolean {
  if (runtimeLock) {
    console.warn("[AgentLoop] Runtime lock already held — cannot start another instance");
    return false;
  }
  runtimeLock = true;
  console.log("[AgentLoop] Runtime lock acquired");
  return true;
}

/**
 * Release the runtime lock.
 */
export function releaseLock(): void {
  runtimeLock = false;
  loopAbortController = null;
  console.log("[AgentLoop] Runtime lock released");
}

/**
 * Check if runtime is locked.
 */
export function isLocked(): boolean {
  return runtimeLock;
}

// ─── Agent Loop ──────────────────────────────────────────

/**
 * Start the persistent agent loop.
 * This is the main entry point for continuous operation.
 */
export async function startAgentLoop(source: RuntimeSource = "local"): Promise<boolean> {
  // 1. Acquire lock
  if (!tryAcquireLock()) {
    return false;
  }

  // 2. Setup abort controller
  loopAbortController = new AbortController();
  const signal = loopAbortController.signal;

  // 3. Initialize runtime state
  state.setSource(source);
  state.setStatus("starting");
  state.clearCurrentTask();

  try {
    // 4. Load scheduler
    await loadLastObservations();
    logActivity("RUNTIME_STARTED", `Agent runtime started from ${source}`);

    // 5. Restore browser
    state.setCurrentPhase("restoring_browser");
    const restored = await restoreBrowser(source);
    if (!restored) {
      state.setStatus("error");
      state.setError("Failed to restore browser");
      logActivity("RUNTIME_ERROR", "Failed to restore browser");
      releaseLock();
      return false;
    }

    // 6. Check TikTok session
    state.setCurrentPhase("checking_session");
    const sessionCheck = await checkSession();
    if (sessionCheck === "active") {
      state.setStatus("active");
      logActivity("SESSION_VALID", "TikTok session is valid");
    } else if (sessionCheck === "session_expired") {
      state.setStatus("session_expired");
      logActivity("SESSION_EXPIRED", "TikTok session expired");
    } else {
      state.setStatus("idle");
    }

    // 7. Start heartbeat
    const heartbeatTimer = startHeartbeat(signal);

    // 8. Run the main loop
    console.log("[AgentLoop] Starting main loop...");
    await runLoop(signal);

    // 9. Cleanup
    clearInterval(heartbeatTimer);
    logActivity("RUNTIME_STOPPED", "Agent runtime stopped");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    state.setError(msg);
    logActivity("RUNTIME_ERROR", `Runtime error: ${msg}`);
    console.error("[AgentLoop] Fatal error:", err);
  } finally {
    state.markStopped();
    state.clearCurrentTask();
    releaseLock();
  }

  return true;
}

/**
 * Stop the agent loop gracefully.
 */
export async function stopAgentLoop(): Promise<void> {
  if (!loopAbortController) {
    console.log("[AgentLoop] No active loop to stop");
    return;
  }

  console.log("[AgentLoop] Stopping agent loop...");
  state.setCurrentPhase("stopping");

  // Signal the loop to stop
  loopAbortController.abort();

  // Close browser session
  const sessionId = state.getSessionId();
  if (sessionId) {
    try {
      const provider = await getBrowserProvider();
      await provider.closeSession(sessionId);
      logActivity("BROWSER_DISCONNECTED", "Browser session closed");
    } catch {
      // Best effort close
    }
  }
}

// ─── Main Loop ───────────────────────────────────────────

async function runLoop(signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    const currentStatus = state.getStatus();

    // If session expired, wait for human action
    if (currentStatus === "session_expired") {
      state.setStatus("human_action_required");
      state.setCurrentPhase("waiting_human");
      logActivity("HUMAN_ACTION_REQUIRED", "Waiting for human to restore TikTok session");

      const resolved = await waitForHumanAction(signal);
      if (resolved) {
        state.setStatus("active");
        state.setCurrentPhase("active");
        logActivity("SESSION_VALID", "Session restored by human");
      } else {
        // Abort requested during human wait
        break;
      }
      continue;
    }

    // If in error state, attempt recovery
    if (currentStatus === "error") {
      state.setCurrentPhase("recovering");
      const recovered = await attemptRecovery(signal);
      if (!recovered) {
        // Could not recover — stay in error and try again later
        await delay(RETRY_MAX_DELAY_MS, signal);
        continue;
      }
      continue;
    }

    // Active/idle — run observation cycle
    if (currentStatus === "active" || currentStatus === "idle") {
      state.setCurrentPhase("scheduling");
      state.clearCurrentTask();

      // Ask scheduler for next target
      const target = getNextTarget();
      if (!target) {
        // No targets due — wait until next one
        const waitMs = calculateNextWait();
        state.setNextTaskInfo(null, null);
        state.setCurrentPhase("waiting");
        logActivity("SCHEDULER_WAITING", `No targets due, waiting ${Math.round(waitMs / 1000)}s`);
        await delay(waitMs, signal);
        continue;
      }

      // Set current task info
      state.setCurrentTask(target.target);
      const nextTarget = getNextTarget();
      state.setNextTaskInfo(
        nextTarget?.target ?? null,
        nextTarget ? calculateNextRun(nextTarget) : null,
      );

      // Perform observation
      state.setCurrentPhase("observing");
      logActivity("OBSERVATION_STARTED", `Observing target: ${target.target}`);

      const result = await performObservationWithRetry(target.target, signal);

      if (result) {
        logActivity(
          "OBSERVATION_COMPLETED",
          `Observation complete: ${target.target} (confidence: ${result.confidence})`,
        );
        state.markObserved();
        markObserved(target.target);

        // Update DB with latest runtime state
        await persistRuntimeState();
      } else {
        logActivity("OBSERVATION_FAILED", `Observation failed: ${target.target}`);
      }

      state.setCurrentPhase("active");
      state.clearCurrentTask();

      // Brief pause before next loop iteration
      await delay(LOOP_IDLE_DELAY_MS, signal);
    }
  }
}

// ─── Observation with Retry ──────────────────────────────

async function performObservationWithRetry(
  target: ObservationTarget,
  signal: AbortSignal,
): Promise<ObservationReport | null> {
  let attempts = 0;
  let delayMs = RETRY_BASE_DELAY_MS;

  while (attempts < RETRY_MAX_ATTEMPTS && !signal.aborted) {
    attempts++;

    try {
      const result = await observeTarget(target, signal);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[AgentLoop] Observation attempt ${attempts} failed: ${msg}`);

      if (attempts >= RETRY_MAX_ATTEMPTS) {
        console.error(`[AgentLoop] Max retry attempts reached for ${target}`);
        return null;
      }

      // Exponential backoff
      await delay(delayMs, signal);
      delayMs = Math.min(delayMs * 2, RETRY_MAX_DELAY_MS);
    }
  }

  return null;
}

// ─── Single Observation ──────────────────────────────────

async function observeTarget(
  target: ObservationTarget,
  signal: AbortSignal,
): Promise<ObservationReport | null> {
  if (signal.aborted) return null;

  const db = getDatabase();
  const account = await db.query.tiktokBrowserAccount.findFirst();

  if (!account || !account.browserProfileId) {
    return null;
  }

  const provider = await getBrowserProvider();
  if (!provider.isAvailable) {
    return null;
  }

  // Launch browser session
  const session = await provider.launchSession(account.browserProfileId, {
    headless: true,
  });

  if (session.status !== "active") {
    throw new Error(`Browser session failed: ${session.status}`);
  }

  try {
    // Navigate to target
    const username = account.username ?? "unknown";
    const navigateUrl = buildTargetUrl(target, username);

    await provider.navigate(session.sessionId, navigateUrl);
    await delay(OBSERVATION_WAIT_MS, signal);

    if (signal.aborted) return null;

    // Get page content
    const content = await provider.getPageContent(session.sessionId);

    // Get previous observation for comparison
    const prevObs = await db.query.browserObservation.findFirst({
      orderBy: desc(browserObservation.observedAt),
    });

    let previousReport: ObservationReport | null = null;
    if (prevObs?.structuredData) {
      try {
        previousReport = prevObs.structuredData as unknown as ObservationReport;
      } catch {
        // Previous data not parseable
      }
    }

    // Build report
    const report = buildObservationReport({
      accountId: account.id,
      url: content.url,
      title: content.title,
      text: content.text,
      metadata: content.metadata,
      previousReport,
    });

    // Compute diff
    let changesDetected = null;
    if (previousReport) {
      const diff = computeDiff(previousReport, report);
      if (diff.length > 0) {
        changesDetected = diff;
      }
    }

    // Save observation
    await db.insert(browserObservation).values({
      accountId: account.id,
      page: report.page,
      category: target,
      rawSummary: report.summary,
      structuredData: report as unknown as Record<string, unknown>,
      importantFindings: null,
      changesDetected: changesDetected as unknown as Record<string, unknown>,
      confidence: report.confidence,
    });

    // Save to AI memory
    if (report.confidence === "high" || report.confidence === "medium") {
      await db.insert(aiMemory).values({
        kind: "fact",
        content: `[${target}] ${report.summary}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    if (changesDetected) {
      await db.insert(aiMemory).values({
        kind: "result",
        content: `[${target}] Changes: ${JSON.stringify(changesDetected)}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    // Update last observed
    await db
      .update(tiktokBrowserAccount)
      .set({ lastObservedAt: new Date(), updatedAt: new Date() })
      .where(eq(tiktokBrowserAccount.id, account.id));

    return report;
  } finally {
    // Always close session (profile persists)
    try {
      await provider.closeSession(session.sessionId);
    } catch {
      // Best effort close
    }
  }
}

// ─── Browser Restore ─────────────────────────────────────

async function restoreBrowser(source: RuntimeSource): Promise<boolean> {
  try {
    const account = (await import("@/lib/account/primary-account")).getPrimaryAccount;
    const acc = await account();

    if (!acc || !acc.browserProfileId) {
      console.warn("[AgentLoop] No primary account configured");
      return false;
    }

    const provider = await getBrowserProvider();
    if (!provider.isAvailable) {
      console.warn(`[AgentLoop] Browser provider not available: ${provider.status}`);
      return false;
    }

    // Check profile exists
    const { exists } = await provider.connectProfile(acc.browserProfileId);
    if (!exists) {
      console.warn("[AgentLoop] Browser profile not found");
      return false;
    }

    // Launch session
    const session = await provider.launchSession(acc.browserProfileId, {
      headless: true,
    });

    if (session.status !== "active") {
      console.warn(`[AgentLoop] Browser session failed: ${session.status}`);
      return false;
    }

    state.setSessionId(session.sessionId);
    logActivity("BROWSER_CONNECTED", `Browser session started: ${session.sessionId.slice(0, 8)}...`);
    return true;
  } catch (err) {
    console.error("[AgentLoop] Browser restore failed:", err);
    return false;
  }
}

// ─── Session Check ───────────────────────────────────────

async function checkSession(): Promise<"active" | "session_expired" | "idle"> {
  const sessionId = state.getSessionId();
  if (!sessionId) return "idle";

  try {
    const provider = await getBrowserProvider();
    if (!provider.isAvailable) return "idle";

    const content = await provider.getPageContent(sessionId);
    const { metadata } = content;

    if (metadata.isLoggedIn) {
      return "active";
    }
    if (metadata.isLoginPage || metadata.hasCaptcha) {
      return "session_expired";
    }
    return "idle";
  } catch {
    return "idle";
  }
}

// ─── Human Action Wait ───────────────────────────────────

async function waitForHumanAction(signal: AbortSignal): Promise<boolean> {
  const startTime = Date.now();

  while (!signal.aborted) {
    if (Date.now() - startTime > MAX_HUMAN_ACTION_WAIT_MS) {
      console.warn("[AgentLoop] Max human action wait time exceeded");
      return false;
    }

    await delay(HUMAN_ACTION_POLL_MS, signal);
    if (signal.aborted) return false;

    // Check if session is now valid
    const result = await checkSession();
    if (result === "active") {
      return true;
    }
  }

  return false;
}

// ─── Recovery ────────────────────────────────────────────

async function attemptRecovery(signal: AbortSignal): Promise<boolean> {
  console.log("[AgentLoop] Attempting recovery...");

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) return false;

    console.log(`[AgentLoop] Recovery attempt ${attempt}/${RETRY_MAX_ATTEMPTS}`);

    // Try to restore browser
    const restored = await restoreBrowser(state.getSource());
    if (restored) {
      // Check session
      const sessionResult = await checkSession();
      if (sessionResult === "active") {
        state.setStatus("active");
        state.setError(null);
        state.setCurrentPhase("active");
        logActivity("RUNTIME_RECOVERED", `Runtime recovered on attempt ${attempt}`);
        return true;
      }
      if (sessionResult === "session_expired") {
        state.setStatus("session_expired");
        state.setError(null);
        return false; // Need human action
      }
    }

    // Wait before retry
    const backoffMs = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS);
    await delay(backoffMs, signal);
  }

  logActivity("RUNTIME_ERROR", "Recovery failed after max attempts");
  return false;
}

// ─── Heartbeat ───────────────────────────────────────────

function startHeartbeat(signal: AbortSignal): ReturnType<typeof setInterval> {
  return setInterval(async () => {
    if (signal.aborted) return;

    try {
      const sessionId = state.getSessionId();
      if (!sessionId) return;

      const provider = await getBrowserProvider();
      if (!provider.isAvailable) return;

      const session = await provider.getSessionStatus(sessionId);

      if (session.status === "closed" || session.status === "not_found") {
        console.warn("[AgentLoop] Heartbeat: browser session lost");
        state.setStatus("error");
        state.setError("Browser session lost");
        logActivity("BROWSER_DISCONNECTED", "Browser session lost during heartbeat");
      } else {
        state.markHeartbeat();
      }
    } catch (err) {
      console.error("[AgentLoop] Heartbeat error:", err);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

// ─── Runtime State Persistence ───────────────────────────

async function persistRuntimeState(): Promise<void> {
  try {
    const db = getDatabase();
    const currentState = state.getState();
    const account = await db.query.tiktokBrowserAccount.findFirst();

    if (account) {
      await db
        .update(tiktokBrowserAccount)
        .set({
          runtimeStatus: currentState.status,
          runtimeSource: currentState.source,
          lastHeartbeatAt: currentState.lastHeartbeatAt
            ? new Date(currentState.lastHeartbeatAt)
            : undefined,
          updatedAt: new Date(),
        })
        .where(eq(tiktokBrowserAccount.id, account.id));
    }
  } catch {
    // Best effort persistence
  }
}

// ─── Activity Log ────────────────────────────────────────

function logActivity(type: string, summary: string): void {
  try {
    const db = getDatabase();
    db.insert(aiActivity).values({
      type: type as typeof aiActivity.$inferInsert.type,
      summary,
    }).catch(() => {});
  } catch {
    // Best effort logging
  }
}

// ─── Scheduling Helpers ──────────────────────────────────

function calculateNextWait(): number {
  const schedule = getSchedule();
  const now = Date.now();

  let minWait = LOOP_IDLE_DELAY_MS;

  for (const entry of schedule) {
    if (!entry.enabled) continue;
    const lastObserved = entry.lastObservedAt
      ? new Date(entry.lastObservedAt).getTime()
      : 0;
    const nextRun = lastObserved + entry.intervalMs;
    const waitMs = Math.max(0, nextRun - now);
    minWait = Math.min(minWait, waitMs);
  }

  // Cap wait at 5 minutes to keep the loop responsive
  return Math.min(minWait, 5 * 60 * 1000);
}

function calculateNextRun(entry: { lastObservedAt: string | null; intervalMs: number }): number {
  const lastObserved = entry.lastObservedAt
    ? new Date(entry.lastObservedAt).getTime()
    : 0;
  return lastObserved + entry.intervalMs;
}

// ─── Utilities ───────────────────────────────────────────

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

// Re-export buildTargetUrl for use
import { buildTargetUrl } from "./scheduler";
