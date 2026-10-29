/**
 * Local Playwright Browser Provider
 *
 * Uses Playwright's persistent browser contexts to maintain
 * browser state (cookies, localStorage, IndexedDB) across sessions.
 *
 * Profile data is stored in ./browser-profiles/<profileId>/
 * on the local filesystem.
 *
 * Supports both headed (visible) and headless modes.
 */

import path from "path";
import fs from "fs";
import type {
  BrowserProvider,
  BrowserProfile,
  BrowserSession,
  PageContent,
  PageMetadata,
  ScreenshotResult,
  LaunchOptions,
} from "./types";

// Detect serverless environments (Vercel, AWS Lambda, etc.)
// where the filesystem is read-only and local profile storage is impossible.
function isServerless(): boolean {
  return (
    !!process.env["VERCEL"] ||
    !!process.env["AWS_LAMBDA_FUNCTION_NAME"] ||
    !!process.env["VERCEL_ENV"] ||
    process.cwd() === "/var/task" ||
    // Vercel serverless functions run from /var/task
    process.cwd().startsWith("/var/task")
  );
}

const PROFILES_DIR = path.resolve(
  process.cwd(),
  "browser-profiles",
);

const TIKTOK_URL = "https://www.tiktok.com";

// ─── In-memory session registry ─────────────────────────────

type SessionEntry = {
  profileId: string;
  browser: Awaited<ReturnType<typeof import("playwright-core").chromium.launchPersistentContext>> | null;
  closed: boolean;
};

const sessions = new Map<string, SessionEntry>();

// ─── Helpers ────────────────────────────────────────────────

function ensureProfilesDir(): void {
  if (isServerless()) {
    throw new Error(
      "Local browser profiles are not available in serverless environments. " +
      "Set BROWSER_PROVIDER=browserless and BROWSERLESS_API_KEY to use cloud browser."
    );
  }
  if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }
}

function getProfileDir(profileId: string): string {
  return path.join(PROFILES_DIR, profileId);
}

function profileExists(profileId: string): boolean {
  return fs.existsSync(getProfileDir(profileId));
}

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract metadata from a TikTok page.
 * Resilient extraction — never throws, returns UNKNOWN values on failure.
 */
async function extractPageMetadata(page: {
  url(): string;
  title(): Promise<string>;
  evaluate<T>(fn: () => T): Promise<T>;
}): Promise<PageMetadata> {
  const url = page.url();
  let title = "";
  try {
    title = await page.title();
  } catch {
    title = "";
  }

  let isLoggedIn = false;
  let detectedUsername: string | null = null;
  let detectedDisplayName: string | null = null;
  let detectedProfileUrl: string | null = null;
  let isLoginPage = false;
  let hasCaptcha = false;
  const errorMessages: string[] = [];

  try {
    const extracted = await page.evaluate(() => {
      const body = document.body?.innerText ?? "";

      // Detect login pages
      const isLoginPage =
        url.includes("/login") ||
        url.includes("/passport") ||
        body.includes("Log in to TikTok") ||
        body.includes("Log in") ||
        body.includes("Sign up") ||
        body.includes("Enter your phone number or email");

      // Detect captcha/challenges
      const hasCaptcha =
        body.includes("Verify") ||
        body.includes("captcha") ||
        body.includes("security verification") ||
        body.includes("suspicious activity") ||
        document.querySelector("[class*=captcha]") !== null ||
        document.querySelector("iframe[src*=captcha]") !== null;

      // Detect if logged in (profile icon, username visible, etc.)
      const profileLink = document.querySelector('a[href*="/@"]');
      const isLoggedIn =
        !isLoginPage &&
        !hasCaptcha &&
        (profileLink !== null ||
          body.includes("For You") ||
          body.includes("Following") ||
          url.includes("/fyp"));

      // Extract username from URL
      let detectedUsername: string | null = null;
      const urlMatch = url.match(/\/@([^/?]+)/);
      if (urlMatch) {
        detectedUsername = urlMatch[1] ?? null;
      }

      // Extract display name from page
      let detectedDisplayName: string | null = null;
      const displayNameEl =
        document.querySelector('[data-e2e="user-info"] h1') ??
        document.querySelector('[data-e2e="user-nickname"]') ??
        document.querySelector("h1[data-e2e]");
      if (displayNameEl) {
        detectedDisplayName = displayNameEl.textContent?.trim() ?? null;
      }

      // Extract profile URL
      let detectedProfileUrl: string | null = null;
      if (detectedUsername) {
        detectedProfileUrl = `https://www.tiktok.com/@${detectedUsername}`;
      }

      // Check for error messages
      const errorMessages: string[] = [];
      const errorEls = document.querySelectorAll(
        '[class*=error], [class*=Error], [data-e2e="error-message"]',
      );
      errorEls.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
          errorMessages.push(text);
        }
      });

      return {
        isLoggedIn,
        detectedUsername,
        detectedDisplayName,
        detectedProfileUrl,
        isLoginPage,
        hasCaptcha,
        errorMessages,
      };
    });

    Object.assign(
      { isLoggedIn, detectedUsername, detectedDisplayName, detectedProfileUrl, isLoginPage, hasCaptcha, errorMessages },
      extracted,
    );

    // Reassign properly (TypeScript needs this pattern)
    return {
      title,
      url,
      isLoggedIn: extracted.isLoggedIn,
      detectedUsername: extracted.detectedUsername,
      detectedDisplayName: extracted.detectedDisplayName,
      detectedProfileUrl: extracted.detectedProfileUrl,
      isLoginPage: extracted.isLoginPage,
      hasCaptcha: extracted.hasCaptcha,
      errorMessages: extracted.errorMessages,
    };
  } catch {
    // Page evaluation failed — return safe defaults
    return {
      title,
      url,
      isLoggedIn: false,
      detectedUsername: null,
      detectedDisplayName: null,
      detectedProfileUrl: null,
      isLoginPage: false,
      hasCaptcha: false,
      errorMessages: [],
    };
  }
}

// ─── Provider Implementation ────────────────────────────────

export class LocalBrowserProvider implements BrowserProvider {
  readonly name = "playwright-local";
  readonly isAvailable: boolean;
  readonly status: string;

  constructor() {
    if (isServerless()) {
      this.isAvailable = false;
      this.status = "not_available — serverless environment; use BROWSER_PROVIDER=browserless";
    } else {
      this.isAvailable = true;
      this.status = "ready";
    }
  }

  async createProfile(name: string): Promise<BrowserProfile> {
    ensureProfilesDir();

    const profileId = `profile-${name}-${Date.now()}`;
    const profileDir = getProfileDir(profileId);

    fs.mkdirSync(profileDir, { recursive: true });

    const profile: BrowserProfile = {
      id: profileId,
      name,
      createdAt: new Date().toISOString(),
    };

    // Save profile metadata
    fs.writeFileSync(
      path.join(profileDir, "profile.json"),
      JSON.stringify(profile, null, 2),
    );

    console.log(`[Browser] Created profile: ${profileId} at ${profileDir}`);
    return profile;
  }

  async connectProfile(
    profileId: string,
  ): Promise<{ exists: boolean; profile: BrowserProfile | null }> {
    if (!profileExists(profileId)) {
      return { exists: false, profile: null };
    }

    const profileFile = path.join(getProfileDir(profileId), "profile.json");
    try {
      const data = fs.readFileSync(profileFile, "utf-8");
      const profile = JSON.parse(data) as BrowserProfile;
      return { exists: true, profile };
    } catch {
      return { exists: false, profile: null };
    }
  }

  async launchSession(
    profileId: string,
    options?: LaunchOptions,
  ): Promise<BrowserSession> {
    if (!profileExists(profileId)) {
      return {
        profileId,
        sessionId: "",
        status: "not_found",
        url: null,
        title: null,
      };
    }

    // Close existing session for this profile if any
    for (const [sid, entry] of sessions.entries()) {
      if (entry.profileId === profileId && !entry.closed) {
        try {
          await entry.browser?.close();
        } catch {
          // ignore
        }
        entry.closed = true;
        sessions.delete(sid);
      }
    }

    const { chromium } = await import("playwright-core");

    const headless = options?.headless ?? true;
    const profileDir = getProfileDir(profileId);

    console.log(
      `[Browser] Launching session for profile ${profileId} (headless: ${headless})`,
    );

    const context = await chromium.launchPersistentContext(profileDir, {
      headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    const sessionId = generateSessionId();

    sessions.set(sessionId, {
      profileId,
      browser: context,
      closed: false,
    });

    // Navigate to TikTok if no pages are open
    const pages = context.pages();
    let page = pages[0];
    if (!page) {
      page = await context.newPage();
    }

    try {
      if (!page.url() || page.url() === "about:blank") {
        await page.goto(TIKTOK_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
    } catch (err) {
      console.error("[Browser] Failed to navigate to TikTok:", err);
    }

    const currentUrl = page.url();
    let title = "";
    try {
      title = await page.title();
    } catch {
      // ignore
    }

    return {
      profileId,
      sessionId,
      status: "active",
      url: currentUrl,
      title,
    };
  }

  async navigate(sessionId: string, url: string): Promise<void> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.browser) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    const pages = entry.browser.pages();
    const page = pages[0];
    if (!page) {
      throw new Error(`No pages found in session ${sessionId}`);
    }

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  }

  async getPageContent(sessionId: string): Promise<PageContent> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.browser) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    const pages = entry.browser.pages();
    const page = pages[0];
    if (!page) {
      throw new Error(`No pages found in session ${sessionId}`);
    }

    const url = page.url();
    let title = "";
    let text = "";
    let html = "";

    try {
      title = await page.title();
    } catch {
      // ignore
    }

    try {
      text = await page.evaluate(() => document.body?.innerText ?? "");
    } catch {
      text = "";
    }

    try {
      html = await page.evaluate(() => document.body?.innerHTML ?? "");
    } catch {
      html = "";
    }

    const metadata = await extractPageMetadata(page);

    return { url, title, text, html, metadata };
  }

  async screenshot(sessionId: string): Promise<ScreenshotResult> {
    const entry = sessions.get(sessionId);
    if (!entry || entry.closed || !entry.browser) {
      throw new Error(`Session ${sessionId} not found or closed`);
    }

    const pages = entry.browser.pages();
    const page = pages[0];
    if (!page) {
      throw new Error(`No pages found in session ${sessionId}`);
    }

    const buffer = await page.screenshot({ type: "png" });
    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };

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
      return {
        profileId: "",
        sessionId,
        status: "not_found",
        url: null,
        title: null,
      };
    }

    if (entry.closed || !entry.browser) {
      return {
        profileId: entry.profileId,
        sessionId,
        status: "closed",
        url: null,
        title: null,
      };
    }

    const pages = entry.browser.pages();
    const page = pages[0];
    const url = page?.url() ?? null;
    let title: string | null = null;
    if (page) {
      try {
        title = await page.title();
      } catch {
        // ignore
      }
    }

    return {
      profileId: entry.profileId,
      sessionId,
      status: "active",
      url,
      title,
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    const entry = sessions.get(sessionId);
    if (!entry) return;

    if (!entry.closed && entry.browser) {
      try {
        await entry.browser.close();
      } catch {
        // ignore — profile data already persisted
      }
    }

    entry.closed = true;
    sessions.delete(sessionId);
    console.log(`[Browser] Closed session ${sessionId} (profile preserved)`);
  }

  async deleteProfile(profileId: string): Promise<void> {
    // Close any active sessions for this profile
    for (const [sid, entry] of sessions.entries()) {
      if (entry.profileId === profileId) {
        try {
          await entry.browser?.close();
        } catch {
          // ignore
        }
        entry.closed = true;
        sessions.delete(sid);
      }
    }

    // Delete profile directory
    const profileDir = getProfileDir(profileId);
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
      console.log(`[Browser] Deleted profile: ${profileId}`);
    }
  }

  async listProfiles(): Promise<BrowserProfile[]> {
    ensureProfilesDir();

    const entries = fs.readdirSync(PROFILES_DIR, { withFileTypes: true });
    const profiles: BrowserProfile[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const profileFile = path.join(
        PROFILES_DIR,
        entry.name,
        "profile.json",
      );
      try {
        const data = fs.readFileSync(profileFile, "utf-8");
        profiles.push(JSON.parse(data) as BrowserProfile);
      } catch {
        // skip invalid profiles
      }
    }

    return profiles;
  }
}
