/**
 * Cloud Browser Provider — Browserless Adapter (Real CDP)
 *
 * Uses Browserless Authenticated Profiles with Playwright's connectOverCDP
 * to establish real browser control via Chrome DevTools Protocol.
 *
 * Browserless Profile Architecture:
 *
 *   PHASE 1 — CREATE PROFILE SESSION:
 *     POST /profile { name } → { connect: "wss://...", stop: "https://..." }
 *     chromium.connectOverCDP(session.connect) → real browser
 *
 *   PHASE 2 — SAVE AUTHENTICATED STATE:
 *     context.newCDPSession(page) → CDP session
 *     cdp.send('Browserless.saveProfile', { name }) → persisted profile
 *
 *   PHASE 3 — REUSE SAVED PROFILE:
 *     wss://.../chromium/playwright?token=TOKEN&profile=PROFILE_NAME
 *     chromium.connect(url) → browser with restored cookies/storage
 *
 * Configuration:
 *   BROWSERLESS_API_KEY=...       (required for cloud)
 *
 * IMPORTANT: browserProfileId in the database stores the Browserless
 * profile NAME (e.g. "hey5050-tiktok-primary"), NOT a profile ID.
 */

import type {
  BrowserProvider,
  BrowserProfile,
  BrowserSession,
  PageContent,
  PageMetadata,
  ScreenshotResult,
  LaunchOptions,
} from "./types";
import { readServerEnv } from "./server-env";

// ─── Lazy-loaded Playwright ────────────────────────────────

let playwrightChromium: typeof import("playwright-core").chromium | null = null;

async function getChromium() {
  if (!playwrightChromium) {
    const pw = await import("playwright-core");
    playwrightChromium = pw.chromium;
  }
  return playwrightChromium;
}

// ─── Configuration ────────────────────────────────────────

const BROWSERLESS_REST = "https://production-sfo.browserless.io";
const BROWSERLESS_WS = "wss://production-sfo.browserless.io";

/**
 * Build a safe diagnostic error message from a raw error.
 * Strips tokens, credentials, and verbose stack traces.
 * Keeps: HTTP status, statusText, error codes, connection info.
 */
function buildSafeError(rawMsg: string): string {
  // Strip any token values that might appear in the message
  let msg = rawMsg.replace(/token=[^&\s"']+/gi, "token=***");
  msg = msg.replace(/Bearer\s+[\w.-]+/gi, "Bearer ***");

  // If it's a fetch/HTTP error, extract status info
  const httpMatch = msg.match(/(\d{3})\s*(\w+)?/);
  if (httpMatch) {
    return `HTTP ${httpMatch[1]}${httpMatch[2] ? " " + httpMatch[2] : ""}`;
  }

  // Connection errors
  if (msg.includes("ECONNREFUSED")) return "Connection refused by Browserless";
  if (msg.includes("ETIMEDOUT") || msg.includes("timeout")) return "Connection timed out";
  if (msg.includes("ENOTFOUND")) return "Browserless host not found";
  if (msg.includes("ECONNRESET")) return "Connection reset by Browserless";

  // Auth errors
  if (msg.includes("401") || msg.includes("Unauthorized")) return "Authentication failed — check BROWSERLESS_API_KEY";
  if (msg.includes("403") || msg.includes("Forbidden")) return "Access denied — check Browserless plan/permissions";

  // Truncate long messages
  if (msg.length > 200) msg = msg.substring(0, 200) + "...";

  return msg;
}

function getApiKey(): string | null {
  // Server-only read; never returned to the client.
  return readServerEnv("BROWSERLESS_API_KEY") || null;
}

function isConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Build a sanitized log-safe representation of a Browserless URL.
 * Strips the token so it never appears in logs.
 */
function sanitizeUrl(url: string): string {
  return url.replace(/token=[^&]+/, "token=***");
}

// ─── In-memory session registry ─────────────────────────────

type CloudSessionEntry = {
  profileName: string;
  sessionId: string;
  /** Playwright Browser instance connected via CDP */
  browser: any | null;
  /** Default context from the browser */
  context: any | null;
  /** Active page */
  page: any | null;
  /** CDP session for Browserless commands */
  cdpSession: any | null;
  /** Whether profile has been saved (Browserless.saveProfile called) */
  profileSaved: boolean;
  closed: boolean;
};

const sessions = new Map<string, CloudSessionEntry>();

// ─── Metadata Extraction ───────────────────────────────────

function extractMetadataFromPage(
  url: string,
  title: string,
  bodyText: string,
): PageMetadata {
  const isLoginPage =
    url.includes("/login") ||
    url.includes("/passport") ||
    bodyText.includes("Log in to TikTok") ||
    bodyText.includes("Log in") ||
    bodyText.includes("Sign up") ||
    bodyText.includes("Enter your phone number or email");

  const hasCaptcha =
    bodyText.includes("Verify") ||
    bodyText.includes("captcha") ||
    bodyText.includes("security verification") ||
    bodyText.includes("suspicious activity");

  const isLoggedIn =
    !isLoginPage &&
    !hasCaptcha &&
    (bodyText.includes("For You") ||
      bodyText.includes("Following") ||
      url.includes("/fyp") ||
      url.includes("/@"));

  let detectedUsername: string | null = null;
  const urlMatch = url.match(/\/@([^/?]+)/);
  if (urlMatch) {
    detectedUsername = urlMatch[1] ?? null;
  }

  let detectedDisplayName: string | null = null;
  const lines = bodyText.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (
      line.length > 2 &&
      line.length < 50 &&
      !line.includes("Log in") &&
      !line.includes("Sign up") &&
      !line.includes("For You") &&
      !line.includes("Following") &&
      !line.includes("Upload") &&
      !line.includes("Settings")
    ) {
      detectedDisplayName = line;
      break;
    }
  }

  const detectedProfileUrl = detectedUsername
    ? `https://www.tiktok.com/@${detectedUsername}`
    : null;

  return {
    title,
    url,
    isLoggedIn,
    detectedUsername,
    detectedDisplayName,
    detectedProfileUrl,
    isLoginPage,
    hasCaptcha,
    errorMessages: [],
  };
}

// ─── Provider Implementation ────────────────────────────────

export class CloudBrowserProvider implements BrowserProvider {
  readonly name = "browserless-cloud";
  readonly isAvailable: boolean;
  readonly status: string;

  constructor() {
    if (isConfigured()) {
      this.isAvailable = true;
      this.status = "ready";
    } else {
      this.isAvailable = false;
      this.status = "not_configured — set BROWSERLESS_API_KEY";
    }
  }

  /**
   * Create a persistent browser profile via Browserless.
   *
   * This does NOT create the Browserless profile on the server yet.
   * It only registers the profile name for later use.
   * The actual Browserless profile is created when:
   *   1. POST /profile { name } → temporary creation session
   *   2. User completes login
   *   3. Browserless.saveProfile { name } → persisted profile
   */
  async createProfile(name: string): Promise<BrowserProfile> {
    if (!this.isAvailable) {
      throw new Error("Cloud browser provider not configured");
    }

    // Use a deterministic profile name scoped to this application
    const profileName = `hey5050-${name}`;

    console.log(`[CloudBrowser] Registering profile name: ${profileName}`);

    const profile: BrowserProfile = {
      id: profileName,
      name: profileName,
      createdAt: new Date().toISOString(),
    };

    return profile;
  }

  async connectProfile(
    profileId: string,
  ): Promise<{ exists: boolean; profile: BrowserProfile | null }> {
    if (!this.isAvailable) {
      return { exists: false, profile: null };
    }

    try {
      // Try to connect to an existing saved profile
      const token = getApiKey()!;
      const url = `${BROWSERLESS_WS}/chromium/playwright?token=${encodeURIComponent(token)}&profile=${encodeURIComponent(profileId)}`;

      console.log(`[CloudBrowser] Testing profile connection: ${sanitizeUrl(url)}`);

      const chromium = await getChromium();
      const browser = await chromium.connect(url);

      // If we connected, the profile exists
      await browser.close();

      return {
        exists: true,
        profile: {
          id: profileId,
          name: profileId,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.warn(`[CloudBrowser] Profile connection test failed: ${buildSafeError(msg)}`);
      return { exists: false, profile: null };
    }
  }

  /**
   * Launch a browser session.
   *
   * If the profile already has saved state (profileSaved=true in a previous session),
   * connect via the reuse endpoint with ?profile=<name>.
   *
   * If no saved state exists yet, create a new Browserless profile creation session
   * via POST /profile and connect via connectOverCDP.
   */
  async launchSession(
    profileId: string,
    _options?: LaunchOptions,
  ): Promise<BrowserSession> {
    if (!this.isAvailable) {
      return { profileId, sessionId: "", status: "error", url: null, title: null };
    }

    // Close existing session for this profile
    for (const [sid, entry] of sessions.entries()) {
      if (entry.profileName === profileId && !entry.closed) {
        try {
          await entry.browser?.close();
        } catch { /* ignore */ }
        entry.closed = true;
        sessions.delete(sid);
      }
    }

    const token = getApiKey()!;
    const sessionId = `cloud-${profileId}-${Date.now()}`;

    // Determine if this profile has been saved before
    // by checking if we have any existing session entries for it
    const hasSavedProfile = this._hasSavedProfile(profileId);

    try {
      let browser: any;

      if (hasSavedProfile) {
        // PHASE 3 — REUSE SAVED PROFILE
        // Connect via the Playwright endpoint with ?profile=<name>
        const reuseUrl = `${BROWSERLESS_WS}/chromium/playwright?token=${encodeURIComponent(token)}&profile=${encodeURIComponent(profileId)}`;

        console.log(`[CloudBrowser] Reusing saved profile: ${profileId}`);
        console.log(`[CloudBrowser] Connect URL: ${sanitizeUrl(reuseUrl)}`);

        const chromium = await getChromium();
        browser = await chromium.connect(reuseUrl);
      } else {
        // PHASE 1 — CREATE NEW PROFILE SESSION
        // POST /profile to get a temporary creation session
        const createUrl = `${BROWSERLESS_REST}/profile?token=${encodeURIComponent(token)}`;

        console.log(`[CloudBrowser] profile session request:start profile=${profileId}`);

        let response: Response;
        try {
          response = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: profileId }),
            signal: AbortSignal.timeout(15_000),
          });
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : "unknown error";
          if (msg.includes("aborted") || msg.includes("timeout")) {
            throw new Error("Browserless profile creation timed out after 15 seconds.");
          }
          throw new Error(`Browserless profile request failed: ${buildSafeError(msg)}`);
        }

        console.log(`[CloudBrowser] profile session response status=${response.status}`);

        if (!response.ok) {
          throw new Error(`Failed to create Browserless profile session: ${response.status} ${response.statusText}`);
        }

        const sessionData = await response.json() as {
          id: string;
          name: string;
          connect: string;
          stop: string;
        };

        console.log(`[CloudBrowser] Profile session created: ${sessionData.id}`);

        // Connect via the returned WebSocket URL
        // Browserless docs show chromium.connect() for this endpoint
        console.log(`[CloudBrowser] chromium.connect:start`);
        const chromium = await getChromium();
        browser = await chromium.connect(sessionData.connect);
        console.log(`[CloudBrowser] chromium.connect:success`);
      }

      const contexts = browser.contexts();
      const context = contexts[0];
      if (!context) {
        throw new Error("No browser context found after CDP connection");
      }

      const pages = context.pages();
      const page = pages[0] ?? await context.newPage();

      sessions.set(sessionId, {
        profileName: profileId,
        sessionId,
        browser,
        context,
        page,
        cdpSession: null,
        profileSaved: hasSavedProfile,
        closed: false,
      });

      const url = page.url();
      const title = await page.title().catch(() => "");

      console.log(`[CloudBrowser] Launched session: ${sessionId} (profile: ${profileId}, saved: ${hasSavedProfile})`);

      return {
        profileId,
        sessionId,
        status: "active",
        url,
        title,
      };
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : "unknown error";
      // Build a safe diagnostic message — no secrets, no raw API responses
      const safeDiagnostic = buildSafeError(rawMsg);
      console.error(`[CloudBrowser] Failed to launch session: ${safeDiagnostic}`);
      return { profileId, sessionId: "", status: "error", url: null, title: null, error: safeDiagnostic };
    }
  }

  /**
   * Save the authenticated profile state via Browserless.saveProfile CDP command.
   *
   * This MUST be called after the user completes manual login to persist
   * cookies, localStorage, and IndexedDB under the profile name.
   *
   * Flow:
   *   1. User completes login in the browser
   *   2. Call saveProfile(sessionId, profileName)
   *   3. Browserless captures browser state and stores it
   *   4. Future sessions can use ?profile=<name> to restore state
   */
  async saveProfile(sessionId: string, profileName: string): Promise<boolean> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.context || !entry.page) {
      console.error(`[CloudBrowser] Cannot save profile: session ${sessionId} not found or closed`);
      return false;
    }

    try {
      // Create a CDP session from the page
      const cdpSession = await entry.context.newCDPSession(entry.page);

      // Send the Browserless.saveProfile CDP command
      const result = await cdpSession.send("Browserless.saveProfile", {
        name: profileName,
      });

      console.log(`[CloudBrowser] Profile saved: ${JSON.stringify(result)}`);

      // Mark this profile as saved so future sessions use the reuse endpoint
      entry.profileSaved = true;
      entry.cdpSession = cdpSession;

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error(`[CloudBrowser] Failed to save profile: ${msg}`);
      return false;
    }
  }

  async navigate(sessionId: string, url: string): Promise<void> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.page) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    await entry.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  }

  async getPageContent(sessionId: string): Promise<PageContent> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.page) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    const page = entry.page;
    const url = page.url();
    let title = "";
    let text = "";
    let html = "";

    try {
      title = await page.title();
    } catch { /* ignore */ }

    try {
      text = await page.evaluate(() => document.body?.innerText ?? "");
    } catch { text = ""; }

    try {
      html = await page.evaluate(() => document.body?.innerHTML ?? "");
    } catch { html = ""; }

    const metadata = extractMetadataFromPage(url, title, text);

    return { url, title, text, html, metadata };
  }

  async screenshot(sessionId: string): Promise<ScreenshotResult> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.page) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    const buffer = await entry.page.screenshot({ type: "png" });
    const viewport = entry.page.viewportSize() ?? { width: 1280, height: 800 };

    return {
      buffer: Buffer.from(buffer),
      width: viewport.width,
      height: viewport.height,
      format: "png",
    };
  }

  async getSessionStatus(sessionId: string): Promise<BrowserSession> {
    const entry = sessions.get(sessionId);
    if (!entry) {
      return { profileId: "", sessionId, status: "not_found", url: null, title: null };
    }

    if (entry.closed) {
      return { profileId: entry.profileName, sessionId, status: "closed", url: null, title: null };
    }

    try {
      if (entry.page) {
        const url = entry.page.url();
        const title = await entry.page.title().catch(() => "");
        return { profileId: entry.profileName, sessionId, status: "active", url, title };
      }
    } catch {
      entry.closed = true;
      return { profileId: entry.profileName, sessionId, status: "closed", url: null, title: null };
    }

    return { profileId: entry.profileName, sessionId, status: "active", url: null, title: null };
  }

  async closeSession(sessionId: string): Promise<void> {
    const entry = sessions.get(sessionId);
    if (!entry) return;

    if (!entry.closed) {
      // Close CDP session if open
      try {
        await entry.cdpSession?.detach();
      } catch { /* best effort */ }

      // Close Playwright browser connection
      // This disconnects from the Browserless CDP session
      // If profile was saved, Browserless retains the state on their server
      try {
        await entry.browser?.close();
      } catch { /* best effort */ }
    }

    entry.closed = true;
    entry.browser = null;
    entry.context = null;
    entry.page = null;
    entry.cdpSession = null;

    console.log(`[CloudBrowser] Closed session ${sessionId} (profile: ${entry.profileName}, saved: ${entry.profileSaved})`);
    sessions.delete(sessionId);
  }

  async deleteProfile(profileId: string): Promise<void> {
    // Close any active sessions for this profile
    for (const [sid, entry] of sessions.entries()) {
      if (entry.profileName === profileId) {
        try {
          await entry.browser?.close();
        } catch { /* ignore */ }
        entry.closed = true;
        sessions.delete(sid);
      }
    }

    if (this.isAvailable) {
      try {
        const token = getApiKey()!;
        // Browserless doesn't have a documented DELETE profile endpoint
        // Profiles are scoped to the API token and managed via the dashboard
        console.log(`[CloudBrowser] Profile ${profileId} marked for deletion (manage via Browserless dashboard)`);
      } catch { /* best effort */ }
    }
  }

  async listProfiles(): Promise<BrowserProfile[]> {
    if (!this.isAvailable) return [];

    // Browserless doesn't have a documented list profiles REST endpoint
    // Return empty — profiles are managed by name reference
    return [];
  }

  /**
   * Internal check: does this profile have saved state?
   * Uses in-memory session history as a proxy.
   * In a real system, this would check Browserless API or database.
   */
  private _hasSavedProfile(profileId: string): boolean {
    for (const entry of sessions.values()) {
      if (entry.profileName === profileId && entry.profileSaved) {
        return true;
      }
    }
    return false;
  }
}
