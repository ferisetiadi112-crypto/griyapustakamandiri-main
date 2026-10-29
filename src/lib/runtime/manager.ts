/**
 * Runtime Manager
 *
 * Coordinates the lifecycle of the AI Agent Runtime.
 * Uses the agent loop for persistent operation.
 * Manages start/stop, provides singleton access, and handles runtime locking.
 */

import {
  startAgentLoop,
  stopAgentLoop,
  isLocked,
} from "./agent-loop";
import * as state from "./state";
import type { RuntimeSource, RuntimeStatus, HeartbeatResult } from "./types";
import { getSchedule } from "./scheduler";

// ─── Lifecycle ───────────────────────────────────────────

/**
 * Start the runtime with persistent agent loop.
 */
export async function startRuntime(source: RuntimeSource = "local"): Promise<boolean> {
  if (isLocked()) {
    console.warn("[Manager] Runtime already active — cannot start another instance");
    return false;
  }

  // Start the agent loop in the background
  // The loop runs until stopped or the process exits
  startAgentLoop(source).catch((err) => {
    console.error("[Manager] Agent loop crashed:", err);
  });

  return true;
}

/**
 * Stop the runtime gracefully.
 */
export async function stopRuntime(): Promise<void> {
  await stopAgentLoop();
}

/**
 * Get the current runtime status.
 */
export async function getRuntimeStatus(): Promise<RuntimeStatus> {
  return state.getStatus();
}

/**
 * Perform a heartbeat check.
 */
export async function getRuntimeHeartbeat(): Promise<HeartbeatResult | null> {
  const sessionId = state.getSessionId();
  if (!sessionId) return null;

  const now = new Date().toISOString();
  return {
    timestamp: now,
    browserAlive: state.getStatus() !== "error",
    tiktokSessionValid: state.getStatus() === "active",
    status: state.getStatus(),
    currentPage: null,
  };
}

/**
 * Run an observation cycle manually.
 */
export async function runObservation(target?: string): Promise<unknown> {
  if (!isLocked()) {
    console.warn("[Manager] No active runtime — cannot observe");
    return null;
  }

  // Import observeTarget directly for manual observation
  const { observeTarget } = await import("./observe");
  const source = state.getSource();
  return observeTarget(source, target as any);
}

/**
 * Get the full runtime state.
 */
export function getRuntimeState() {
  return state.getState();
}

/**
 * Get the observation schedule.
 */
export function getObservationSchedule() {
  return getSchedule();
}

/**
 * Check if runtime is active.
 */
export function isRuntimeActive(): boolean {
  return isLocked();
}
