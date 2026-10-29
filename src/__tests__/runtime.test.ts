import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getState,
  getStatus,
  getSource,
  getSessionId,
  setStatus,
  setSource,
  setSessionId,
  setError,
  markStarted,
  markStopped,
  markHeartbeat,
  markObserved,
  resetState,
  formatStatus,
  formatSource,
} from "@/lib/runtime/state";
import {
  getSchedule,
  getEnabledTargets,
  getNextTarget,
  markObserved as markTargetObserved,
  buildTargetUrl,
} from "@/lib/runtime/scheduler";
import {
  getRuntimeState,
} from "@/lib/runtime/manager";

// ─── State Tests ─────────────────────────────────────────

describe("Runtime State", () => {
  beforeEach(() => {
    resetState();
  });

  it("initializes with offline status", () => {
    const state = getState();
    expect(state.status).toBe("offline");
    expect(state.source).toBe("local");
    expect(state.sessionId).toBeNull();
    expect(state.error).toBeNull();
  });

  it("sets status correctly", () => {
    setStatus("active");
    expect(getStatus()).toBe("active");
  });

  it("sets source correctly", () => {
    setSource("cloud");
    expect(getSource()).toBe("cloud");
  });

  it("sets session id correctly", () => {
    setSessionId("abc123");
    expect(getSessionId()).toBe("abc123");
  });

  it("sets error and changes status to error", () => {
    setError("test error");
    expect(getStatus()).toBe("error");
    expect(getState().error).toBe("test error");
  });

  it("clears error message", () => {
    setError("test error");
    setError(null);
    expect(getState().error).toBeNull();
    // Note: clearing error doesn't automatically restore previous status
    // That's intentional — caller should explicitly set status after clearing error
  });

  it("marks started", () => {
    markStarted();
    expect(getStatus()).toBe("active");
    expect(getState().startedAt).not.toBeNull();
  });

  it("marks stopped", () => {
    markStarted();
    markStopped();
    expect(getStatus()).toBe("offline");
    expect(getState().sessionId).toBeNull();
  });

  it("marks heartbeat", () => {
    markHeartbeat();
    expect(getState().lastHeartbeatAt).not.toBeNull();
  });

  it("marks observed", () => {
    markObserved();
    expect(getState().lastObservationAt).not.toBeNull();
  });

  it("resets state", () => {
    markStarted();
    setSessionId("abc");
    resetState();
    expect(getStatus()).toBe("offline");
    expect(getSessionId()).toBeNull();
  });
});

// ─── Format Tests ────────────────────────────────────────

describe("Runtime Formatting", () => {
  it("formats status correctly", () => {
    expect(formatStatus("active")).toContain("Active");
    expect(formatStatus("offline")).toContain("Offline");
    expect(formatStatus("session_expired")).toContain("Session Expired");
    expect(formatStatus("human_action_required")).toContain("Human Action Required");
    expect(formatStatus("error")).toContain("Error");
  });

  it("formats source correctly", () => {
    expect(formatSource("local")).toBe("Local Computer");
    expect(formatSource("vps")).toBe("VPS / Server");
    expect(formatSource("cloud")).toBe("Cloud Browser");
    expect(formatSource("device")).toBe("Mobile Device");
  });
});

// ─── Scheduler Tests ─────────────────────────────────────

describe("Observation Scheduler", () => {
  it("returns a non-empty schedule", () => {
    const schedule = getSchedule();
    expect(schedule.length).toBeGreaterThan(0);
  });

  it("has profile and content targets enabled", () => {
    const enabled = getEnabledTargets();
    const targetNames = enabled.map((e) => e.target);
    expect(targetNames).toContain("profile");
    expect(targetNames).toContain("content");
  });

  it("can find next target when overdue", () => {
    // All targets start with lastObservedAt = null, so they should all be overdue
    const next = getNextTarget();
    expect(next).not.toBeNull();
    expect(next!.target).toBeDefined();
  });

  it("marks target observed", () => {
    const before = getSchedule().find((s) => s.target === "profile");
    expect(before?.lastObservedAt).toBeNull();

    markTargetObserved("profile");

    const after = getSchedule().find((s) => s.target === "profile");
    expect(after?.lastObservedAt).not.toBeNull();
  });

  it("builds URLs correctly", () => {
    const url = buildTargetUrl("profile", "testuser");
    expect(url).toBe("https://www.tiktok.com/@testuser");

    const analyticsUrl = buildTargetUrl("analytics");
    expect(analyticsUrl).toContain("tiktok.com");
  });
});

// ─── Runtime Manager Tests ───────────────────────────────

describe("Runtime Manager", () => {
  it("returns runtime state when no runtime is active", () => {
    const state = getRuntimeState();
    expect(state.status).toBe("offline");
  });
});

// ─── Security Tests ──────────────────────────────────────

describe("Runtime Security", () => {
  it("does not expose access_token in state", () => {
    const state = getState();
    expect(state).not.toHaveProperty("accessToken");
    expect(state).not.toHaveProperty("access_token");
  });

  it("does not expose refresh_token in state", () => {
    const state = getState();
    expect(state).not.toHaveProperty("refreshToken");
    expect(state).not.toHaveProperty("refresh_token");
  });

  it("does not expose password in state", () => {
    const state = getState();
    expect(state).not.toHaveProperty("password");
  });

  it("does not expose TikTok OAuth in state", () => {
    const state = getState();
    expect(state).not.toHaveProperty("tiktokClientKey");
    expect(state).not.toHaveProperty("tiktokClientSecret");
  });
});
