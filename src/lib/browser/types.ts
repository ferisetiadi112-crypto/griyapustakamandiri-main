/**
 * Browser Provider Abstraction
 *
 * Defines the interface that all browser providers must implement.
 * This abstraction ensures Hey5050's Agent Runtime is not locked
 * to any specific browser provider (Playwright local, Browserbase,
 * Browserless, etc.).
 *
 * The Agent never knows whether the browser runs on:
 * - Local PC (Playwright)
 * - VPS/Server (Playwright)
 * - Cloud (Browserbase/Browserless)
 */

// ─── Types ──────────────────────────────────────────────────

export type BrowserProfile = {
  id: string;
  name: string;
  createdAt: string;
};

export type SessionStatus =
  | "active"
  | "idle"
  | "closed"
  | "error"
  | "not_found";

export type BrowserSession = {
  profileId: string;
  sessionId: string;
  status: SessionStatus;
  url: string | null;
  title: string | null;
  /** Safe diagnostic error message (no secrets, no raw API responses) */
  error?: string;
};

export type PageContent = {
  url: string;
  title: string;
  /** Visible text content from the page */
  text: string;
  /** HTML content of the page body */
  html: string;
  /** Metadata extracted from the page */
  metadata: PageMetadata;
};

export type PageMetadata = {
  /** Page title */
  title: string;
  /** Current URL */
  url: string;
  /** Whether the user appears to be logged in to TikTok */
  isLoggedIn: boolean;
  /** Detected TikTok username from the page, if visible */
  detectedUsername: string | null;
  /** Detected display name from the page, if visible */
  detectedDisplayName: string | null;
  /** Detected profile URL from the page, if visible */
  detectedProfileUrl: string | null;
  /** Whether the page appears to be a login/security page */
  isLoginPage: boolean;
  /** Whether a CAPTCHA or security challenge is visible */
  hasCaptcha: boolean;
  /** Any error messages visible on the page */
  errorMessages: string[];
};

export type ScreenshotResult = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "png";
};

export type LaunchOptions = {
  /** Run browser in headless mode (no visible window) */
  headless?: boolean;
  /** Run browser in headed mode (visible window) */
  headed?: boolean;
};

// ─── Provider Interface ─────────────────────────────────────

export interface BrowserProvider {
  /** Name of the provider for logging/debugging */
  readonly name: string;

  /** Whether the provider is configured and available */
  readonly isAvailable: boolean;

  /** Human-readable status of the provider */
  readonly status: string;

  /**
   * Create a new persistent browser profile.
   * The profile directory/context will persist across sessions.
   */
  createProfile(name: string): Promise<BrowserProfile>;

  /**
   * Connect to an existing persistent browser profile.
   * Does NOT launch a browser — only verifies the profile exists.
   */
  connectProfile(profileId: string): Promise<{ exists: boolean; profile: BrowserProfile | null }>;

  /**
   * Launch a browser session using a persistent profile.
   * Returns a session handle that can be used for navigation and content extraction.
   */
  launchSession(
    profileId: string,
    options?: LaunchOptions,
  ): Promise<BrowserSession>;

  /**
   * Navigate to a URL within an active session.
   */
  navigate(sessionId: string, url: string): Promise<void>;

  /**
   * Get the visible page content from an active session.
   * Includes text, HTML, and metadata extraction.
   */
  getPageContent(sessionId: string): Promise<PageContent>;

  /**
   * Take a screenshot of the current page.
   */
  screenshot(sessionId: string): Promise<ScreenshotResult>;

  /**
   * Get the current session status.
   */
  getSessionStatus(sessionId: string): Promise<BrowserSession>;

  /**
   * Close the browser session but keep the profile persistent.
   * The next launchSession() with the same profileId will restore state.
   */
  closeSession(sessionId: string): Promise<void>;

  /**
   * Delete a profile entirely (including all browser state).
   */
  deleteProfile(profileId: string): Promise<void>;

  /**
   * List all persistent profiles managed by this provider.
   */
  listProfiles(): Promise<BrowserProfile[]>;
}
