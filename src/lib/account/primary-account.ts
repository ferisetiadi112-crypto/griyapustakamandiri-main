/**
 * Primary TikTok Account Service
 *
 * Manages the SINGLE primary TikTok account using persistent browser profiles.
 * No TikTok API, no OAuth, no access tokens.
 *
 * Account state is determined by reading the actual TikTok page
 * displayed in the browser — not by API calls.
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tiktokBrowserAccount, browserObservation } from "@/db/schema";
import { getBrowserProvider } from "@/lib/browser";

// ─── Types ──────────────────────────────────────────────────

export type AccountStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "session_expired"
  | "login_required"
  | "human_action_required"
  | "browser_error";

export type PrimaryAccount = {
  id: number;
  platform: string;
  username: string | null;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  browserProfileId: string | null;
  status: AccountStatus;
  lastObservedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConnectResult = {
  success: boolean;
  profileId?: string;
  sessionId?: string;
  error?: string;
};

export type SessionRestoreResult = {
  success: boolean;
  status: AccountStatus;
  browserActive: boolean;
  error?: string;
};

// ─── Account CRUD ───────────────────────────────────────────

/**
 * Get the primary TikTok account (there should be only one).
 */
export async function getPrimaryAccount(): Promise<PrimaryAccount | null> {
  const db = getDatabase();
  const account = await db.query.tiktokBrowserAccount.findFirst({
    orderBy: desc(tiktokBrowserAccount.createdAt),
  });

  if (!account) return null;

  return {
    id: account.id,
    platform: account.platform,
    username: account.username,
    displayName: account.displayName,
    profileUrl: account.profileUrl,
    avatarUrl: account.avatarUrl,
    browserProfileId: account.browserProfileId,
    status: (account.status as AccountStatus) ?? "not_connected",
    lastObservedAt: account.lastObservedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/**
 * Create or update the primary TikTok account.
 */
export async function upsertPrimaryAccount(data: {
  username?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
  browserProfileId?: string;
  status?: AccountStatus;
}): Promise<PrimaryAccount> {
  const db = getDatabase();
  const existing = await db.query.tiktokBrowserAccount.findFirst();

  if (existing) {
    await db
      .update(tiktokBrowserAccount)
      .set({
        ...(data.username != null ? { username: data.username } : {}),
        ...(data.displayName != null ? { displayName: data.displayName } : {}),
        ...(data.profileUrl != null ? { profileUrl: data.profileUrl } : {}),
        ...(data.avatarUrl != null ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.browserProfileId != null
          ? { browserProfileId: data.browserProfileId }
          : {}),
        ...(data.status != null ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tiktokBrowserAccount.id, existing.id));
  } else {
    await db.insert(tiktokBrowserAccount).values({
      platform: "tiktok",
      username: data.username ?? null,
      displayName: data.displayName ?? null,
      profileUrl: data.profileUrl ?? null,
      avatarUrl: data.avatarUrl ?? null,
      browserProfileId: data.browserProfileId ?? null,
      status: data.status ?? "not_connected",
    });
  }

  const account = await getPrimaryAccount();
  return account!;
}

/**
 * Update account status.
 */
export async function updateAccountStatus(
  status: AccountStatus,
): Promise<void> {
  const db = getDatabase();
  const existing = await db.query.tiktokBrowserAccount.findFirst();
  if (existing) {
    await db
      .update(tiktokBrowserAccount)
      .set({ status, updatedAt: new Date() })
      .where(eq(tiktokBrowserAccount.id, existing.id));
  }
}

/**
 * Update last observed timestamp.
 */
export async function updateLastObserved(): Promise<void> {
  const db = getDatabase();
  const existing = await db.query.tiktokBrowserAccount.findFirst();
  if (existing) {
    await db
      .update(tiktokBrowserAccount)
      .set({ lastObservedAt: new Date(), updatedAt: new Date() })
      .where(eq(tiktokBrowserAccount.id, existing.id));
  }
}

// ─── Browser Connection ─────────────────────────────────────

const PRIMARY_PROFILE_NAME = "tiktok-primary";

/**
 * Connect the primary TikTok account.
 * Creates a persistent browser profile if it doesn't exist.
 * Launches the browser and navigates to TikTok login page.
 */
export async function connectPrimaryAccount(): Promise<ConnectResult> {
  console.log(`[PrimaryAccount] connectPrimaryAccount:start`);

  console.log(`[PrimaryAccount] resolving browser provider`);
  const provider = await getBrowserProvider();
  console.log(`[PrimaryAccount] browser provider resolved: ${provider.name} (available=${provider.isAvailable})`);

  if (!provider.isAvailable) {
    return {
      success: false,
      error: `Browser provider not available: ${provider.status}`,
    };
  }

  try {
    const existing = await getPrimaryAccount();
    let profileId = existing?.browserProfileId;

    // Create profile if it doesn't exist
    if (!profileId) {
      console.log(`[PrimaryAccount] creating browser profile: ${PRIMARY_PROFILE_NAME}`);
      const profile = await provider.createProfile(PRIMARY_PROFILE_NAME);
      profileId = profile.id;
      console.log(`[PrimaryAccount] browser profile created: ${profileId}`);

      console.log(`[PrimaryAccount] saving browser account state`);
      await upsertPrimaryAccount({
        browserProfileId: profileId,
        status: "connecting",
      });
      console.log(`[PrimaryAccount] browser account state saved`);
    }

    // Launch browser session (headed for user login)
    console.log(`[PrimaryAccount] launching browser session: ${profileId}`);
    const session = await provider.launchSession(profileId, {
      headless: false,
      headed: true,
    });

    if (session.status !== "active") {
      console.error(`[PrimaryAccount] browser session failed: ${session.error ?? session.status}`);
      await updateAccountStatus("browser_error");
      return {
        success: false,
        profileId,
        error: session.error
        ?? `Browser session failed to start: ${session.status}`,
      };
    }

    console.log(`[PrimaryAccount] browser session launched: ${session.sessionId}`);

    // Navigate to TikTok login
    console.log(`[PrimaryAccount] navigating to TikTok login`);
    await provider.navigate(session.sessionId, "https://www.tiktok.com/login");
    console.log(`[PrimaryAccount] TikTok login page loaded`);

    console.log(`[PrimaryAccount] connectPrimaryAccount:success`);
    return {
      success: true,
      profileId,
      sessionId: session.sessionId,
    };
  } catch (err) {
    console.error(`[PrimaryAccount] connectPrimaryAccount:error`, err instanceof Error ? err.message : err);
    await updateAccountStatus("browser_error");
    return {
      success: false,
      error: `Connect failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

/**
 * After user completes login, detect the account from the browser page.
 */
export async function detectAccountFromBrowser(
  sessionId: string,
): Promise<{ detected: boolean; username?: string; displayName?: string }> {
  const provider = await getBrowserProvider();

  try {
    const content = await provider.getPageContent(sessionId);
    const { metadata } = content;

    if (metadata.detectedUsername) {
      const username = metadata.detectedUsername;
      const displayName = metadata.detectedDisplayName ?? null;
      const profileUrl = metadata.detectedProfileUrl ?? null;
      await upsertPrimaryAccount({
        username,
        ...(displayName != null ? { displayName } : {}),
        ...(profileUrl != null ? { profileUrl } : {}),
        status: "connected",
      });

      return {
        detected: true,
        username,
        ...(displayName != null ? { displayName } : {}),
      };
    }

    return { detected: false };
  } catch {
    return { detected: false };
  }
}

/**
 * Restore a browser session for the primary account.
 * Used on startup to reconnect to the persistent profile.
 */
export async function restorePrimarySession(): Promise<SessionRestoreResult> {
  const account = await getPrimaryAccount();

  if (!account || !account.browserProfileId) {
    return {
      success: false,
      status: "not_connected",
      browserActive: false,
    };
  }

  const provider = await getBrowserProvider();

  if (!provider.isAvailable) {
    return {
      success: false,
      status: "browser_error",
      browserActive: false,
      error: `Browser provider not available: ${provider.status}`,
    };
  }

  try {
    // Check if profile exists
    const { exists } = await provider.connectProfile(account.browserProfileId);
    if (!exists) {
      await updateAccountStatus("not_connected");
      return {
        success: false,
        status: "not_connected",
        browserActive: false,
        error: "Browser profile not found",
      };
    }

    // Launch session (headless for agent runtime)
    const session = await provider.launchSession(account.browserProfileId, {
      headless: true,
    });

    if (session.status !== "active") {
      await updateAccountStatus("browser_error");
      return {
        success: false,
        status: "browser_error",
        browserActive: false,
        error: session.error
        ?? `Browser session failed: ${session.status}`,
      };
    }

    // Check if TikTok session is still valid
    const content = await provider.getPageContent(session.sessionId);
    const { metadata } = content;

    if (metadata.isLoggedIn) {
      // Detect account info
      if (metadata.detectedUsername) {
        const username = metadata.detectedUsername;
        const displayName = metadata.detectedDisplayName ?? null;
        const profileUrl = metadata.detectedProfileUrl ?? null;
        await upsertPrimaryAccount({
          username,
          ...(displayName != null ? { displayName } : {}),
          ...(profileUrl != null ? { profileUrl } : {}),
          status: "connected",
        });
      } else {
        await updateAccountStatus("connected");
      }

      return {
        success: true,
        status: "connected",
        browserActive: true,
      };
    }

    if (metadata.isLoginPage || metadata.hasCaptcha) {
      await updateAccountStatus("session_expired");
      return {
        success: true,
        status: "session_expired",
        browserActive: true,
      };
    }

    // Unknown state — assume session needs re-authentication
    await updateAccountStatus("session_expired");
    return {
      success: true,
      status: "session_expired",
      browserActive: true,
    };
  } catch (err) {
    await updateAccountStatus("browser_error");
    return {
      success: false,
      status: "browser_error",
      browserActive: false,
      error: `Restore failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ─── Observation Helpers ────────────────────────────────────

/**
 * Get the most recent observation for the primary account.
 */
export async function getLatestObservation() {
  const db = getDatabase();
  const account = await getPrimaryAccount();
  if (!account) return null;

  const observations = await db.query.browserObservation.findMany({
    orderBy: desc(browserObservation.observedAt),
    limit: 1,
  });

  return observations[0] ?? null;
}

/**
 * Get recent observations for the primary account.
 */
export async function getRecentObservations(limit: number = 10) {
  const db = getDatabase();
  return db.query.browserObservation.findMany({
    orderBy: desc(browserObservation.observedAt),
    limit,
  });
}
