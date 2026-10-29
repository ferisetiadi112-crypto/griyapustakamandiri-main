/**
 * Runtime Heartbeat
 *
 * Checks whether the browser and TikTok session are still alive.
 * Reports the current status back to the runtime.
 *
 * Heartbeat flow:
 * 1. Check if browser provider is available
 * 2. Check if session is still active
 * 3. Check if TikTok is still logged in
 * 4. Update runtime state
 * 5. Return heartbeat result
 */

import { getBrowserProvider } from "@/lib/browser";
import type { HeartbeatResult, RuntimeStatus } from "./types";
import * as state from "./state";

// ─── Heartbeat ───────────────────────────────────────────

/**
 * Perform a heartbeat check on the runtime.
 */
export async function performHeartbeat(): Promise<HeartbeatResult> {
  const now = new Date().toISOString();
  const sessionId = state.getSessionId();

  // No session — runtime is offline
  if (!sessionId) {
    const result: HeartbeatResult = {
      timestamp: now,
      browserAlive: false,
      tiktokSessionValid: false,
      status: "offline",
      currentPage: null,
    };
    state.markHeartbeat();
    return result;
  }

  try {
    const provider = await getBrowserProvider();

    if (!provider.isAvailable) {
      const result: HeartbeatResult = {
        timestamp: now,
        browserAlive: false,
        tiktokSessionValid: false,
        status: "error",
        currentPage: null,
        error: `Browser provider not available: ${provider.status}`,
      };
      state.setError(result.error ?? null);
      state.markHeartbeat();
      return result;
    }

    // Check session status
    const session = await provider.getSessionStatus(sessionId);

    if (session.status === "closed" || session.status === "not_found" || session.status === "error") {
      const result: HeartbeatResult = {
        timestamp: now,
        browserAlive: false,
        tiktokSessionValid: false,
        status: "error",
        currentPage: null,
        error: `Browser session status: ${session.status}`,
      };
      state.setStatus("error");
      state.setError(result.error ?? null);
      state.markHeartbeat();
      return result;
    }

    // Browser is alive — check TikTok session validity
    const content = await provider.getPageContent(sessionId);
    const { metadata } = content;

    let tiktokStatus: RuntimeStatus;
    if (metadata.isLoggedIn) {
      tiktokStatus = "active";
    } else if (metadata.isLoginPage || metadata.hasCaptcha) {
      tiktokStatus = "session_expired";
    } else {
      // Unknown page — might still be logged in
      tiktokStatus = "idle";
    }

    const result: HeartbeatResult = {
      timestamp: now,
      browserAlive: true,
      tiktokSessionValid: metadata.isLoggedIn,
      status: tiktokStatus,
      currentPage: content.url,
    };

    state.setStatus(tiktokStatus);
    state.markHeartbeat();

    // Log activity if status changed
    if (tiktokStatus === "session_expired") {
      console.log("[Heartbeat] TikTok session expired — human action may be required");
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown heartbeat error";
    const result: HeartbeatResult = {
      timestamp: now,
      browserAlive: false,
      tiktokSessionValid: false,
      status: "error",
      currentPage: null,
      error: errorMsg,
    };
    state.setError(errorMsg);
    state.markHeartbeat();
    return result;
  }
}
