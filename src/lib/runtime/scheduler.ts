/**
 * Observation Scheduler
 *
 * Manages which TikTok pages to observe and when.
 * Uses observation targets with priorities to determine the next action.
 *
 * The scheduler is designed to be AI-driven in the future:
 * - AI can adjust priorities based on findings
 * - AI can add/remove observation targets
 * - AI can change intervals based on content patterns
 */

import { desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { browserObservation } from "@/db/schema";
import type { ObservationTarget, ObservationPriority, ObservationScheduleEntry } from "./types";

// ─── TikTok URLs for Each Target ─────────────────────────

const TARGET_URLS: Record<ObservationTarget, string> = {
  profile: "https://www.tiktok.com/@{username}",
  content: "https://www.tiktok.com/@{username}",
  video_performance: "https://www.tiktok.com/@{username}",
  analytics: "https://www.tiktok.com/creator/analytics/overview",
  comments: "https://www.tiktok.com/@{username}",
  messages: "https://www.tiktok.com/inbox",
  notifications: "https://www.tiktok.com/notification",
  studio: "https://www.tiktok.com/tiktokstudio/upload",
  audience: "https://www.tiktok.com/creator/analytics/audience",
};

// ─── Default Schedule ────────────────────────────────────

const DEFAULT_INTERVALS: Record<ObservationTarget, number> = {
  profile: 30 * 60 * 1000,         // every 30 min
  content: 60 * 60 * 1000,         // every 60 min
  video_performance: 60 * 60 * 1000, // every 60 min
  analytics: 4 * 60 * 60 * 1000,   // every 4 hours
  comments: 2 * 60 * 60 * 1000,    // every 2 hours
  messages: 2 * 60 * 60 * 1000,    // every 2 hours
  notifications: 30 * 60 * 1000,   // every 30 min
  studio: 4 * 60 * 60 * 1000,      // every 4 hours
  audience: 6 * 60 * 60 * 1000,    // every 6 hours
};

const DEFAULT_PRIORITIES: Record<ObservationTarget, ObservationPriority> = {
  profile: "medium",
  content: "medium",
  video_performance: "high",
  analytics: "high",
  comments: "medium",
  messages: "low",
  notifications: "high",
  studio: "low",
  audience: "low",
};

// ─── Schedule State ──────────────────────────────────────

let schedule: ObservationScheduleEntry[] = Object.keys(DEFAULT_INTERVALS).map(
  (target) => ({
    target: target as ObservationTarget,
    priority: DEFAULT_PRIORITIES[target as ObservationTarget],
    lastObservedAt: null,
    intervalMs: DEFAULT_INTERVALS[target as ObservationTarget],
    enabled: target !== "messages" && target !== "studio", // Disable targets that require special access initially
  }),
);

// ─── Schedule Accessors ──────────────────────────────────

export function getSchedule(): ObservationScheduleEntry[] {
  return [...schedule];
}

export function getEnabledTargets(): ObservationScheduleEntry[] {
  return schedule.filter((s) => s.enabled);
}

// ─── Next Target Selection ───────────────────────────────

/**
 * Determine which target should be observed next.
 * Uses priority and time-since-last-observation to decide.
 */
export function getNextTarget(): ObservationScheduleEntry | null {
  const now = Date.now();
  const enabled = getEnabledTargets();

  if (enabled.length === 0) return null;

  // Score each target: higher score = should be observed sooner
  const scored = enabled.map((entry) => {
    const lastObserved = entry.lastObservedAt
      ? new Date(entry.lastObservedAt).getTime()
      : 0;
    const timeSinceLast = now - lastObserved;
    const overdue = Math.max(0, timeSinceLast - entry.intervalMs);

    // Priority weight
    const priorityWeight =
      entry.priority === "high" ? 3 :
      entry.priority === "medium" ? 2 :
      1;

    return { entry, score: overdue * priorityWeight };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return the target with highest score, but only if it's overdue
  if (scored[0]!.score > 0) {
    return scored[0]!.entry;
  }

  return null;
}

// ─── Mark Observation Complete ───────────────────────────

/**
 * Mark a target as recently observed.
 */
export function markObserved(target: ObservationTarget): void {
  const entry = schedule.find((s) => s.target === target);
  if (entry) {
    entry.lastObservedAt = new Date().toISOString();
  }
}

// ─── Load Last Observed from Database ────────────────────

/**
 * Load the last observation timestamps from the database.
 */
export async function loadLastObservations(): Promise<void> {
  try {
    const db = getDatabase();
    const recentObs = await db.query.browserObservation.findMany({
      orderBy: desc(browserObservation.observedAt),
      limit: 50,
    });

    // Update schedule entries with last observed times
    for (const entry of schedule) {
      const matchingObs = recentObs.find((obs) => obs.category === entry.target);
      if (matchingObs) {
        entry.lastObservedAt = matchingObs.observedAt.toISOString();
      }
    }
  } catch {
    // Database not available — schedule uses in-memory state
  }
}

// ─── URL Builder ─────────────────────────────────────────

/**
 * Build the URL for a given observation target.
 */
export function buildTargetUrl(
  target: ObservationTarget,
  username?: string,
): string {
  const url = TARGET_URLS[target] ?? "https://www.tiktok.com";
  return url.replace("{username}", username ?? "unknown");
}

// ─── Schedule Configuration ──────────────────────────────

export function setTargetEnabled(target: ObservationTarget, enabled: boolean): void {
  const entry = schedule.find((s) => s.target === target);
  if (entry) {
    entry.enabled = enabled;
  }
}

export function setTargetPriority(target: ObservationTarget, priority: ObservationPriority): void {
  const entry = schedule.find((s) => s.target === target);
  if (entry) {
    entry.priority = priority;
  }
}

export function setTargetInterval(target: ObservationTarget, intervalMs: number): void {
  const entry = schedule.find((s) => s.target === target);
  if (entry) {
    entry.intervalMs = intervalMs;
  }
}
