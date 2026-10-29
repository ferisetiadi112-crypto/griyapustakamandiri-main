import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getState,
  getStatus,
  setStatus,
  setCurrentPhase,
  setCurrentTask,
  setNextTaskInfo,
  clearCurrentTask,
  getCurrentPhase,
  getCurrentTask,
  getNextTaskTarget,
  getNextTaskRunAt,
  resetState,
} from "@/lib/runtime/state";
import {
  tryAcquireLock,
  releaseLock,
  isLocked,
} from "@/lib/runtime/agent-loop";
import {
  isRuntimeActive,
} from "@/lib/runtime/manager";

// ─── Runtime Lock Tests ──────────────────────────────────

describe("Runtime Lock", () => {
  beforeEach(() => {
    releaseLock(); // Ensure clean state
  });

  it("acquires lock when free", () => {
    expect(tryAcquireLock()).toBe(true);
    expect(isLocked()).toBe(true);
  });

  it("rejects second lock attempt", () => {
    expect(tryAcquireLock()).toBe(true);
    expect(tryAcquireLock()).toBe(false); // Second attempt fails
  });

  it("releases lock", () => {
    tryAcquireLock();
    expect(isLocked()).toBe(true);
    releaseLock();
    expect(isLocked()).toBe(false);
  });

  it("can re-acquire after release", () => {
    tryAcquireLock();
    releaseLock();
    expect(tryAcquireLock()).toBe(true);
  });
});

// ─── Task Tracking Tests ─────────────────────────────────

describe("Task Tracking", () => {
  beforeEach(() => {
    resetState();
  });

  it("initializes with no current task", () => {
    expect(getCurrentTask()).toBeNull();
    expect(getCurrentPhase()).toBeNull();
  });

  it("sets current task", () => {
    setCurrentTask("analytics");
    expect(getCurrentTask()).toBe("analytics");
  });

  it("sets current phase", () => {
    setCurrentPhase("observing");
    expect(getCurrentPhase()).toBe("observing");
  });

  it("sets next task info", () => {
    const nextRun = Date.now() + 3600000; // 1 hour from now
    setNextTaskInfo("content", nextRun);
    expect(getNextTaskTarget()).toBe("content");
    expect(getNextTaskRunAt()).not.toBeNull();
  });

  it("clears current task", () => {
    setCurrentTask("analytics");
    setCurrentPhase("observing");
    clearCurrentTask();
    expect(getCurrentTask()).toBeNull();
    expect(getCurrentPhase()).toBeNull();
  });

  it("includes task info in state", () => {
    setCurrentTask("profile");
    setCurrentPhase("active");
    const state = getState();
    expect(state.currentTask).toBe("profile");
    expect(state.currentPhase).toBe("active");
  });
});

// ─── State Extended Tests ────────────────────────────────

describe("Extended State", () => {
  beforeEach(() => {
    resetState();
  });

  it("resets extended state on reset", () => {
    setCurrentTask("analytics");
    setCurrentPhase("observing");
    resetState();
    expect(getCurrentTask()).toBeNull();
    expect(getCurrentPhase()).toBeNull();
    expect(getNextTaskTarget()).toBeNull();
  });
});

// ─── Manager Active Check ────────────────────────────────

describe("Manager Active Check", () => {
  beforeEach(() => {
    releaseLock();
  });

  it("reports inactive when no lock", () => {
    expect(isRuntimeActive()).toBe(false);
  });

  it("reports active when locked", () => {
    tryAcquireLock();
    expect(isRuntimeActive()).toBe(true);
    releaseLock();
  });
});

// ─── Runtime Lifecycle States ────────────────────────────

describe("Runtime Lifecycle", () => {
  beforeEach(() => {
    resetState();
    releaseLock();
  });

  it("goes through starting → active lifecycle", () => {
    setStatus("starting");
    expect(getStatus()).toBe("starting");

    setStatus("active");
    expect(getStatus()).toBe("active");
  });

  it("goes through session_expired → human_action_required", () => {
    setStatus("session_expired");
    expect(getStatus()).toBe("session_expired");

    setStatus("human_action_required");
    expect(getStatus()).toBe("human_action_required");
  });

  it("goes through error → recovery", () => {
    setStatus("error");
    expect(getStatus()).toBe("error");

    setStatus("active");
    expect(getStatus()).toBe("active");
  });

  it("handles stopping phase", () => {
    setCurrentPhase("stopping");
    expect(getCurrentPhase()).toBe("stopping");
  });
});

// ─── Observation with Task Tracking ──────────────────────

describe("Observation with Task Tracking", () => {
  beforeEach(() => {
    resetState();
  });

  it("sets current task during observation", () => {
    setCurrentTask("analytics");
    setCurrentPhase("observing");
    expect(getCurrentTask()).toBe("analytics");
    expect(getCurrentPhase()).toBe("observing");
  });

  it("clears task after observation", () => {
    setCurrentTask("analytics");
    setCurrentPhase("observing");
    clearCurrentTask();
    expect(getCurrentTask()).toBeNull();
    expect(getCurrentPhase()).toBeNull();
  });

  it("sets next task after observation", () => {
    const nextRun = Date.now() + 1800000; // 30 min
    setNextTaskInfo("content", nextRun);
    expect(getNextTaskTarget()).toBe("content");
    expect(getNextTaskRunAt()).not.toBeNull();
  });
});
