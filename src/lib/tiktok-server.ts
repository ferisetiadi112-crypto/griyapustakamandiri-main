import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  deleteCookie,
  setCookie,
} from "@tanstack/react-start/server";
import {
  generateState,
  sha256,
  hmacSign,
  base64urlEncode,
  base64urlDecode,
} from "@/lib/tiktok-auth";
import {
  exchangeCodeForToken,
  getUserProfile,
} from "@/lib/tiktok-client";
import {
  storeTokens,
  getAccountInfo,
  removeTokens,
} from "@/lib/tiktok-token-service";
import { discoverCapabilities } from "@/lib/tiktok-capabilities";
import { getAccountState } from "@/lib/tiktok-account-service";
import {
  runAiCycle,
  getRecentAiActivity,
  getPendingHumanTasks,
  completeHumanTask,
  getAiStatus,
} from "@/lib/ai";

// ─── Types ──────────────────────────────────────────────────

type TikTokSession = {
  connected: boolean;
  openId?: string;
  displayName?: string;
  avatarUrl?: string;
};

type OAuthInitResult = {
  success: boolean;
  authUrl?: string;
  error?: string;
};

// ─── Helpers ────────────────────────────────────────────────

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

function getSessionSecret(): string | null {
  const sessionSecret = process.env["SESSION_SECRET"];
  if (sessionSecret) return sessionSecret;
  if (!isProduction()) {
    return process.env["TIKTOK_CLIENT_SECRET"] ?? null;
  }
  return null;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── Server Functions ───────────────────────────────────────

/**
 * Initiates the TikTok OAuth flow:
 * 1. Validates configuration
 * 2. Generates a cryptographic state parameter
 * 3. Stores the state hash in an httpOnly cookie
 * 4. Returns the TikTok authorization URL
 */
export const initiateTikTokOAuth = createServerFn({
  method: "GET" as const,
}).handler(async (): Promise<OAuthInitResult> => {
  const clientKey = process.env["TIKTOK_CLIENT_KEY"];
  const redirectUri = process.env["TIKTOK_REDIRECT_URI"];

  // Diagnostic logging (no secrets exposed)
  console.log("[OAuth:INIT] env check:", {
    TIKTOK_CLIENT_KEY_present: !!clientKey,
    TIKTOK_CLIENT_KEY_length: clientKey?.length ?? 0,
    TIKTOK_REDIRECT_URI_present: !!redirectUri,
    TIKTOK_REDIRECT_URI_value: redirectUri ?? "MISSING",
    environment: process.env["NODE_ENV"] ?? "unknown",
  });

  if (!clientKey || !redirectUri) {
    console.error("[OAuth:INIT] BLOCKED — missing env vars:", {
      clientKey: !!clientKey,
      redirectUri: !!redirectUri,
    });
    return { success: false, error: "config_missing" };
  }

  const state = generateState();
  const stateHash = await sha256(state);

  setCookie("hey5050_oauth_state", stateHash, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes
  });

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  return {
    success: true,
    authUrl: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
  };
});

/**
 * Handles the TikTok OAuth callback (SERVER-SIDE):
 * 1. Reads code/state from the request URL
 * 2. Validates the state parameter (constant-time)
 * 3. Exchanges the code for an access token (server-side)
 * 4. Fetches TikTok user info
 * 5. PERSISTS tokens in the database (NOT in cookies, NOT on client)
 * 6. Creates an HMAC-signed session cookie
 * 7. Returns the redirect URL
 *
 * Access tokens and refresh tokens NEVER leave the server.
 */
export const handleTikTokCallback = createServerFn({
  method: "POST" as const,
})
  .validator(
    (input: { code: string; state: string }) => input,
  )
  .handler(async ({ data }): Promise<{ success: boolean; redirectUrl: string; error?: string }> => {
    const clientKey = process.env["TIKTOK_CLIENT_KEY"];
    const clientSecret = process.env["TIKTOK_CLIENT_SECRET"];
    const redirectUri = process.env["TIKTOK_REDIRECT_URI"];
    const sessionSecret = getSessionSecret();

    // Diagnostic logging (no secrets exposed)
    console.log("[OAuth:CALLBACK] env check:", {
      TIKTOK_CLIENT_KEY_present: !!clientKey,
      TIKTOK_CLIENT_KEY_length: clientKey?.length ?? 0,
      TIKTOK_CLIENT_SECRET_present: !!clientSecret,
      TIKTOK_CLIENT_SECRET_length: clientSecret?.length ?? 0,
      TIKTOK_REDIRECT_URI_present: !!redirectUri,
      TIKTOK_REDIRECT_URI_value: redirectUri ?? "MISSING",
      SESSION_SECRET_present: !!sessionSecret,
      environment: process.env["NODE_ENV"] ?? "unknown",
    });

    if (!clientKey || !clientSecret || !redirectUri || !sessionSecret) {
      console.error("[OAuth:CALLBACK] BLOCKED — missing env vars:", {
        clientKey: !!clientKey,
        clientSecret: !!clientSecret,
        redirectUri: !!redirectUri,
        sessionSecret: !!sessionSecret,
      });
      return { success: false, redirectUrl: "/?error=config_missing" };
    }

    const { code, state } = data;

    if (!code) {
      return { success: false, redirectUrl: "/?error=missing_code" };
    }

    if (!state) {
      return { success: false, redirectUrl: "/?error=missing_state" };
    }

    // Validate OAuth state
    const storedHash = getCookie("hey5050_oauth_state");
    if (!storedHash) {
      return {
        success: false,
        redirectUrl: "/?error=missing_state_cookie",
      };
    }

    // Clear state cookie immediately (single-use, prevent replay)
    deleteCookie("hey5050_oauth_state", { path: "/" });

    // Constant-time state validation
    const receivedHash = await sha256(state);
    const storedBytes = hexToBytes(storedHash);
    const receivedBytes = hexToBytes(receivedHash);

    if (!constantTimeEqual(storedBytes, receivedBytes)) {
      return { success: false, redirectUrl: "/?error=invalid_state" };
    }

    // Exchange authorization code for access token (SERVER-SIDE)
    const tokenResult = await exchangeCodeForToken({
      code,
      clientKey,
      clientSecret,
      redirectUri,
    });

    if ("error" in tokenResult) {
      console.error("[OAuth:CALLBACK] token exchange failed:", tokenResult.error);
      return { success: false, redirectUrl: `/?error=${tokenResult.error}` };
    }

    console.log("[OAuth:CALLBACK] token exchange OK:", {
      has_access_token: !!tokenResult.tokens.access_token,
      has_refresh_token: !!tokenResult.tokens.refresh_token,
      scope: tokenResult.tokens.scope ?? null,
    });

    const accessToken = tokenResult.tokens.access_token;

    // Fetch TikTok user information
    const userResult = await getUserProfile(accessToken);

    if ("error" in userResult) {
      return { success: false, redirectUrl: `/?error=${userResult.error}` };
    }

    const tiktokUser = userResult.user;

    if (!tiktokUser.open_id) {
      return { success: false, redirectUrl: "/?error=missing_user_data" };
    }

    // ── PERSIST TOKENS SERVER-SIDE (never sent to client) ──
    const storeResult = await storeTokens({
      openId: tiktokUser.open_id,
      accessToken: tokenResult.tokens.access_token,
      ...(tokenResult.tokens.refresh_token != null ? { refreshToken: tokenResult.tokens.refresh_token } : {}),
      ...(tokenResult.tokens.expires_in != null ? { expiresIn: tokenResult.tokens.expires_in } : {}),
      ...(tokenResult.tokens.scope != null ? { scopes: tokenResult.tokens.scope } : {}),
      displayName: tiktokUser.display_name ?? "TikTok User",
      avatarUrl: tiktokUser.avatar_url ?? "",
    });

    if (!storeResult.success) {
      return {
        success: false,
        redirectUrl: `/?error=DATABASE_FAILED: ${storeResult.error ?? "unknown"}`,
      };
    }

    // Create HMAC-signed session cookie (safe profile data only, no tokens)
    const payload = JSON.stringify({
      open_id: tiktokUser.open_id,
      display_name: tiktokUser.display_name ?? "TikTok User",
      avatar_url: tiktokUser.avatar_url ?? "",
      connected_at: new Date().toISOString(),
    });

    const signature = await hmacSign(payload, sessionSecret);
    const sessionValue = `${signature}.${base64urlEncode(payload)}`;

    setCookie("hey5050_session", sessionValue, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return { success: true, redirectUrl: "/dashboard" };
  });

/**
 * Reads the HMAC-signed session cookie and returns safe account info.
 * Never returns access_token, refresh_token, or client_secret.
 */
export const getTikTokSession = createServerFn({ method: "GET" as const })
  .handler(async (): Promise<TikTokSession> => {
    try {
      const sessionSecret = getSessionSecret();
      if (!sessionSecret) return { connected: false };

      const sessionValue = getCookie("hey5050_session");
      if (!sessionValue) return { connected: false };

      const dotIndex = sessionValue.indexOf(".");
      if (dotIndex === -1) return { connected: false };

      const receivedSignature = sessionValue.slice(0, dotIndex);
      const payloadBase64 = sessionValue.slice(dotIndex + 1);

      let payload: string;
      try {
        payload = base64urlDecode(payloadBase64);
      } catch {
        return { connected: false };
      }

      // Verify HMAC signature with constant-time comparison
      const expectedSignature = await hmacSign(payload, sessionSecret);
      const receivedBytes = hexToBytes(receivedSignature);
      const expectedBytes = hexToBytes(expectedSignature);

      if (!constantTimeEqual(receivedBytes, expectedBytes)) {
        return { connected: false };
      }

      let session: Record<string, unknown>;
      try {
        session = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        return { connected: false };
      }

      return {
        connected: true,
        ...(typeof session["open_id"] === "string"
          ? { openId: session["open_id"] }
          : {}),
        ...(typeof session["display_name"] === "string"
          ? { displayName: session["display_name"] }
          : {}),
        ...(typeof session["avatar_url"] === "string"
          ? { avatarUrl: session["avatar_url"] }
          : {}),
      };
    } catch {
      return { connected: false };
    }
  });

/**
 * Gets the connected account info from the database.
 * Does NOT expose tokens.
 */
export const getConnectedAccount = createServerFn({
  method: "GET" as const,
}).handler(async () => {
  return getAccountInfo();
});

/**
 * Clears session cookie, database tokens, and OAuth state cookie.
 */
export const logoutTikTok = createServerFn({ method: "GET" as const })
  .handler(async (): Promise<{ success: boolean }> => {
    try {
      // Remove tokens from database
      await removeTokens();
      // Clear cookies
      deleteCookie("hey5050_session", { path: "/" });
      deleteCookie("hey5050_oauth_state", { path: "/" });
      return { success: true };
    } catch {
      return { success: false };
    }
  });

/**
 * Get all TikTok capabilities and their current status.
 * Returns safe information only — no tokens or secrets.
 */
export const getCapabilities = createServerFn({ method: "GET" as const })
  .handler(async () => {
    return discoverCapabilities();
  });

/**
 * Get the current TikTok account state with real profile data.
 * Returns safe data only — no tokens or secrets.
 */
export const getAccountStateServer = createServerFn({ method: "GET" as const })
  .handler(async () => {
    return getAccountState();
  });

/**
 * Get AI system status.
 * Returns safe info about AI provider configuration.
 */
export const getAiStatusServer = createServerFn({ method: "GET" as const })
  .handler(async () => {
    return getAiStatus();
  });

/**
 * Run a single AI cycle. Explicitly callable — no automatic loops.
 */
export const runAiCycleServer = createServerFn({ method: "POST" as const })
  .handler(async () => {
    const result = await runAiCycle();
    return {
      decision: {
        ...result.decision,
        metadata: result.decision.metadata
          ? JSON.stringify(result.decision.metadata)
          : undefined,
      },
      executed: result.executed,
      ...(result.error != null ? { error: result.error } : {}),
    };
  });

/**
 * Get recent AI activity for the dashboard.
 */
export const getAiActivityServer = createServerFn({ method: "GET" as const })
  .handler(async () => {
    const rows = await getRecentAiActivity(10);
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      summary: r.summary,
      metadata: r.metadata ? JSON.stringify(r.metadata) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

/**
 * Get pending human tasks.
 */
export const getHumanTasksServer = createServerFn({ method: "GET" as const })
  .handler(async () => {
    const rows = await getPendingHumanTasks();
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      status: r.status,
      metadata: r.metadata ? JSON.stringify(r.metadata) : null,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  });

/**
 * Mark a human task as completed.
 */
export const completeHumanTaskServer = createServerFn({ method: "POST" as const })
  .validator((input: { taskId: number }) => input)
  .handler(async ({ data }) => {
    await completeHumanTask(data.taskId);
    return { success: true };
  });

/**
 * Safe diagnostics endpoint — returns boolean status only, no secrets.
 */
export const getTikTokDiagnostics = createServerFn({
  method: "GET" as const,
}).handler(async () => {
  const hasClientKey = !!process.env["TIKTOK_CLIENT_KEY"];
  const hasClientSecret = !!process.env["TIKTOK_CLIENT_SECRET"];
  const hasRedirectUri = !!process.env["TIKTOK_REDIRECT_URI"];
  const hasSessionSecret = !!process.env["SESSION_SECRET"];
  const hasDatabaseUrl = !!process.env["DATABASE_URL"];

  return {
    tiktok_config: hasClientKey && hasClientSecret && hasRedirectUri
      ? "configured"
      : "missing",
    session_config: hasSessionSecret ? "configured" : "missing",
    database_config: hasDatabaseUrl ? "configured" : "missing",
    environment: isProduction() ? "production" : "development",
  };
});
