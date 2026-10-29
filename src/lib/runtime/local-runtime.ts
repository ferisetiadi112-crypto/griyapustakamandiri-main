/**
 * Local Runtime Implementation
 *
 * Uses Playwright on the local machine to manage a persistent browser
 * session for the primary TikTok account. This is the first and primary
 * runtime implementation.
 *
 * Flow:
 * 1. Load primary account from database
 * 2. Connect to persistent browser profile
 * 3. Start/restore browser session
 * 4. Check TikTok login status
 * 5. Agent begins observation cycle
 */

import { getBrowserProvider } from "@/lib/browser";
import { getPrimaryAccount } from "@/lib/account/primary-account";
import { performHeartbeat } from "./heartbeat";
import { getNextTarget, markObserved, buildTargetUrl, loadLastObservations } from "./scheduler";
import * as state from "./state";
import type {
  AgentRuntime,
  RuntimeSource,
  RuntimeStatus,
  HeartbeatResult,
  ObservationTarget,
} from "./types";
import { observeTarget as doObserveTarget } from "./observe";

// ─── Local Runtime ───────────────────────────────────────

export class LocalRuntime implements AgentRuntime {
  readonly source: RuntimeSource = "local";
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    console.log("[Runtime] Starting local runtime...");
    state.setSource("local");
    state.setStatus("starting");

    try {
      // Load last observation timestamps from DB
      await loadLastObservations();

      // Check browser provider
      const provider = await getBrowserProvider();
      if (!provider.isAvailable) {
        state.setError(`Browser provider not available: ${provider.status}`);
        return;
      }

      // Connect to primary account
      await this.connectPrimaryAccount();

      // Start heartbeat interval (every 30 seconds)
      this.startHeartbeatInterval();

      state.markStarted();
      console.log("[Runtime] Local runtime started successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      state.setError(`Failed to start runtime: ${msg}`);
      console.error("[Runtime] Start failed:", err);
    }
  }

  async stop(): Promise<void> {
    console.log("[Runtime] Stopping local runtime...");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    const sessionId = state.getSessionId();
    if (sessionId) {
      try {
        const provider = await getBrowserProvider();
        await provider.closeSession(sessionId);
      } catch {
        // Best effort close
      }
    }

    state.markStopped();
    console.log("[Runtime] Local runtime stopped");
  }

  async status(): Promise<RuntimeStatus> {
    return state.getStatus();
  }

  async heartbeat(): Promise<HeartbeatResult> {
    return performHeartbeat();
  }

  async connectPrimaryAccount(): Promise<void> {
    console.log("[Runtime] Connecting to primary TikTok account...");

    const account = await getPrimaryAccount();
    if (!account || !account.browserProfileId) {
      state.setStatus("offline");
      state.setError("No primary TikTok account configured");
      return;
    }

    const provider = await getBrowserProvider();
    if (!provider.isAvailable) {
      state.setError(`Browser provider not available: ${provider.status}`);
      return;
    }

    // Check if profile exists
    const { exists } = await provider.connectProfile(account.browserProfileId);
    if (!exists) {
      state.setStatus("offline");
      state.setError("Browser profile not found — please connect account first");
      return;
    }

    // Launch session (headless for agent runtime)
    const session = await provider.launchSession(account.browserProfileId, {
      headless: true,
    });

    if (session.status !== "active") {
      state.setError(session.error ?? `Browser session failed to start: ${session.status}`);
      return;
    }

    state.setSessionId(session.sessionId);

    // Check if TikTok session is valid
    const content = await provider.getPageContent(session.sessionId);
    const { metadata } = content;

    if (metadata.isLoggedIn) {
      state.setStatus("active");
      console.log("[Runtime] TikTok session is valid");
    } else if (metadata.isLoginPage || metadata.hasCaptcha) {
      state.setStatus("session_expired");
      console.log("[Runtime] TikTok session expired — human action required");
    } else {
      state.setStatus("idle");
      console.log("[Runtime] Browser connected but TikTok status unknown");
    }
  }

  async observe(target?: ObservationTarget): Promise<unknown> {
    const currentStatus = state.getStatus();
    if (currentStatus !== "active" && currentStatus !== "idle") {
      console.warn(`[Runtime] Cannot observe in status: ${currentStatus}`);
      return null;
    }

    const observeTargetName = target ?? getNextTarget()?.target;
    if (!observeTargetName) {
      console.log("[Runtime] No observation targets due");
      return null;
    }

    console.log(`[Runtime] Observing target: ${observeTargetName}`);
    state.setStatus("active");

    const result = await doObserveTarget(this.source, observeTargetName);

    markObserved(observeTargetName);
    state.markObserved();

    return result;
  }

  async execute(action: unknown): Promise<unknown> {
    // Phase 1C: execute is a placeholder for future browser actions
    console.log("[Runtime] Execute not yet implemented:", action);
    return null;
  }

  async getLastHeartbeat(): Promise<HeartbeatResult | null> {
    return performHeartbeat();
  }

  // ─── Internal ────────────────────────────────────────

  private startHeartbeatInterval(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const result = await performHeartbeat();
        if (result.status === "session_expired") {
          console.log("[Runtime] Heartbeat detected session expiration");
        }
        if (result.status === "error") {
          console.error("[Runtime] Heartbeat detected error:", result.error);
        }
      } catch (err) {
        console.error("[Runtime] Heartbeat failed:", err);
      }
    }, 30_000); // Every 30 seconds
  }
}
