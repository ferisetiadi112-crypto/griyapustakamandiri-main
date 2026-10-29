/**
 * Runtime State Management
 *
 * Tracks the current state of the AI Agent Runtime.
 * State is persisted in memory and optionally in the database.
 */

import type { RuntimeSource, RuntimeStatus, RuntimeState } from "./types";

// ─── In-memory state ─────────────────────────────────────

let currentState: RuntimeState = {
  source: "local",
  status: "offline",
  startedAt: null,
  lastHeartbeatAt: null,
  lastObservationAt: null,
  sessionId: null,
  error: null,
  currentPhase: null,
  currentTask: null,
  nextTaskTarget: null,
  nextTaskRunAt: null,
};

// ─── Extended State (not persisted) ──────────────────────

let currentPhase: string | null = null;
let currentTask: string | null = null;
let nextTaskTarget: string | null = null;
let nextTaskRunAt: string | null = null;

// ─── State Accessors ─────────────────────────────────────

export function getState(): RuntimeState {
  return {
    ...currentState,
    currentPhase,
    currentTask,
    nextTaskTarget,
    nextTaskRunAt,
  };
}

export function getStatus(): RuntimeStatus {
  return currentState.status;
}

export function getSource(): RuntimeSource {
  return currentState.source;
}

export function getSessionId(): string | null {
  return currentState.sessionId;
}

export function getLastError(): string | null {
  return currentState.error;
}

// ─── State Mutators ──────────────────────────────────────

export function setStatus(status: RuntimeStatus): void {
  currentState.status = status;
}

export function setSource(source: RuntimeSource): void {
  currentState.source = source;
}

export function setSessionId(sessionId: string | null): void {
  currentState.sessionId = sessionId;
}

export function setError(error: string | null): void {
  currentState.error = error;
  if (error) {
    currentState.status = "error";
  }
}

export function markStarted(): void {
  currentState.startedAt = new Date().toISOString();
  currentState.status = "active";
  currentState.error = null;
}

export function markStopped(): void {
  currentState.status = "offline";
  currentState.sessionId = null;
}

export function markHeartbeat(): void {
  currentState.lastHeartbeatAt = new Date().toISOString();
}

export function markObserved(): void {
  currentState.lastObservationAt = new Date().toISOString();
}

export function resetState(): void {
  currentState = {
    source: currentState.source,
    status: "offline",
    startedAt: null,
    lastHeartbeatAt: null,
    lastObservationAt: null,
    sessionId: null,
    error: null,
    currentPhase: null,
    currentTask: null,
    nextTaskTarget: null,
    nextTaskRunAt: null,
  };
  currentPhase = null;
  currentTask = null;
  nextTaskTarget = null;
  nextTaskRunAt = null;
}

// ─── Task Tracking ───────────────────────────────────────

export function getCurrentPhase(): string | null {
  return currentPhase;
}

export function setCurrentPhase(phase: string | null): void {
  currentPhase = phase;
}

export function getCurrentTask(): string | null {
  return currentTask;
}

export function setCurrentTask(task: string | null): void {
  currentTask = task;
}

export function setNextTaskInfo(target: string | null, runAt: number | null): void {
  nextTaskTarget = target;
  nextTaskRunAt = runAt ? new Date(runAt).toISOString() : null;
}

export function getNextTaskTarget(): string | null {
  return nextTaskTarget;
}

export function getNextTaskRunAt(): string | null {
  return nextTaskRunAt;
}

export function clearCurrentTask(): void {
  currentTask = null;
  currentPhase = null;
}

// ─── Formatting ──────────────────────────────────────────

export function formatStatus(status: RuntimeStatus): string {
  switch (status) {
    case "offline": return "● Offline";
    case "starting": return "◌ Starting...";
    case "active": return "● Active";
    case "idle": return "● Idle";
    case "session_expired": return "⚠ Session Expired";
    case "human_action_required": return "⚠ Human Action Required";
    case "error": return "✗ Error";
    default: return "? Unknown";
  }
}

export function formatSource(source: RuntimeSource): string {
  switch (source) {
    case "local": return "Local Computer";
    case "vps": return "VPS / Server";
    case "cloud": return "Cloud Browser";
    case "device": return "Mobile Device";
    default: return "Unknown";
  }
}
