/**
 * YouTube Server Functions
 *
 * Server-side only functions for YouTube OAuth and session management.
 * Uses the same HMAC-signed cookie pattern as TikTok but with a separate cookie.
 * Tokens NEVER leave the server.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  deleteCookie,
  setCookie,
} from "@tanstack/react-start/server";
import {
  sha256,
  hmacSign,
  base64urlEncode,
  base64urlDecode,
} from "@/lib/tiktok-auth";
import {
  buildYouTubeAuthUrl,
  exchangeCodeForTokens,
  getChannelInfo,
} from "@/lib/youtube-oauth";
import {
  storeTokens,
  getAccountInfo,
  removeTokens,
} from "@/lib/youtube-token-service";

// ─── Types ──────────────────────────────────────────────────

type YouTubeSession = {
  connected: boolean;
  googleUserId?: string;
  channelTitle?: string;
  channelThumbnail?: string;
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
    return process.env["YOUTUBE_CLIENT_SECRET"] ?? null;
  }
  return null;
}

// ─── Server Functions ───────────────────────────────────────

/**
 * Initiates the YouTube/Google OAuth flow.
 */
export const initiateYouTubeOAuth = createServerFn({
  method: "GET" as const,
}).handler(async (): Promise<OAuthInitResult> => {
  const clientId = process.env["YOUTUBE_CLIENT_ID"];
  const redirectUri = process.env["YOUTUBE_REDIRECT_URI"];

  console.log("[YouTube:INIT] env check:", {
    YOUTUBE_CLIENT_ID_present: !!clientId,
    YOUTUBE_CLIENT_ID_length: clientId?.length ?? 0,
    YOUTUBE_REDIRECT_URI_present: !!redirectUri,
    YOUTUBE_REDIRECT_URI_value: redirectUri ?? "MISSING",
    environment: process.env["NODE_ENV"] ?? "unknown",
  });

  if (!clientId || !redirectUri) {
    console.error("[YouTube:INIT] BLOCKED — missing env vars:", {
      clientId: !!clientId,
      redirectUri: !!redirectUri,
    });
    return { success: false, error: "config_missing" };
  }

  const { url, state } = buildYouTubeAuthUrl({
    clientId,
    redirectUri,
  });

  const stateHash = await sha256(state);

  setCookie("hey5050_youtube_state", stateHash, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes
  });

  return { success: true, authUrl: url };
});

/**
 * Handles the YouTube/Google OAuth callback (SERVER-SIDE).
 */
export const handleYouTubeCallback = createServerFn({
  method: "POST" as const,
})
  .validator((input: { code: string; state: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; redirectUrl: string; error?: string }> => {
      const clientId = process.env["YOUTUBE_CLIENT_ID"];
      const clientSecret = process.env["YOUTUBE_CLIENT_SECRET"];
      const redirectUri = process.env["YOUTUBE_REDIRECT_URI"];
      const sessionSecret = getSessionSecret();

      console.log("[YouTube:CALLBACK] env check:", {
        YOUTUBE_CLIENT_ID_present: !!clientId,
        YOUTUBE_CLIENT_ID_length: clientId?.length ?? 0,
        YOUTUBE_CLIENT_SECRET_present: !!clientSecret,
        YOUTUBE_CLIENT_SECRET_length: clientSecret?.length ?? 0,
        YOUTUBE_REDIRECT_URI_present: !!redirectUri,
        environment: process.env["NODE_ENV"] ?? "unknown",
      });

      if (!clientId || !clientSecret || !redirectUri || !sessionSecret) {
        console.error("[YouTube:CALLBACK] BLOCKED — missing env vars");
        return {
          success: false,
          redirectUrl: "/?error=youtube_config_missing",
        };
      }

      const { code, state } = data;

      if (!code) {
        return {
          success: false,
          redirectUrl: "/?error=youtube_missing_code",
        };
      }

      if (!state) {
        return {
          success: false,
          redirectUrl: "/?error=youtube_missing_state",
        };
      }

      // Validate OAuth state
      const storedHash = getCookie("hey5050_youtube_state");
      if (!storedHash) {
        return {
          success: false,
          redirectUrl: "/?error=youtube_missing_state_cookie",
        };
      }

      // Clear state cookie immediately (single-use, prevent replay)
      deleteCookie("hey5050_youtube_state", { path: "/" });

      // Constant-time state validation
      const receivedHash = await sha256(state);

      const ytHexToBytes = (h: string): Uint8Array => {
        const bytes = new Uint8Array(h.length / 2);
        for (let i = 0; i < h.length; i += 2)
          bytes[i / 2] = parseInt(h.substring(i, i + 2), 16);
        return bytes;
      };
      const ytConstantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
        if (a.byteLength !== b.byteLength) return false;
        let diff = 0;
        for (let i = 0; i < a.byteLength; i++) diff |= a[i]! ^ b[i]!;
        return diff === 0;
      };

      if (!ytConstantTimeEqual(ytHexToBytes(storedHash), ytHexToBytes(receivedHash))) {
        return {
          success: false,
          redirectUrl: "/?error=youtube_invalid_state",
        };
      }

      // Exchange authorization code for tokens (SERVER-SIDE)
      const tokenResult = await exchangeCodeForTokens({
        code,
        clientId,
        clientSecret,
        redirectUri,
      });

      if ("error" in tokenResult) {
        console.error(
          "[YouTube:CALLBACK] token exchange failed:",
          tokenResult.error,
        );
        return {
          success: false,
          redirectUrl: `/?error=${encodeURIComponent(tokenResult.error)}`,
        };
      }

      console.log("[YouTube:CALLBACK] token exchange OK:", {
        has_access_token: !!tokenResult.tokens.access_token,
        has_refresh_token: !!tokenResult.tokens.refresh_token,
        scope: tokenResult.tokens.scope ?? null,
      });

      const accessToken = tokenResult.tokens.access_token;

      // Decode id_token to get Google user ID (sub claim)
      let googleUserId = "";
      if (tokenResult.tokens.id_token) {
        try {
          const parts = tokenResult.tokens.id_token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              base64urlDecode(parts[1]!),
            ) as Record<string, unknown>;
            googleUserId = (payload["sub"] as string) ?? "";
          }
        } catch {
          // id_token parsing failed — will try to get from channel info
        }
      }

      // Fetch YouTube channel info
      const channelResult = await getChannelInfo(accessToken);

      if ("error" in channelResult) {
        console.error(
          "[YouTube:CALLBACK] channel fetch failed:",
          channelResult.error,
        );
        return {
          success: false,
          redirectUrl: `/?error=${encodeURIComponent(channelResult.error)}`,
        };
      }

      const channel = channelResult.channel;

      // If we didn't get googleUserId from id_token, use channel ID as fallback
      if (!googleUserId) {
        googleUserId = channel.id;
      }

      // ── PERSIST TOKENS SERVER-SIDE ──
      const storeResult = await storeTokens({
        googleUserId,
        accessToken: tokenResult.tokens.access_token,
        ...(tokenResult.tokens.refresh_token != null
          ? { refreshToken: tokenResult.tokens.refresh_token }
          : {}),
        ...(tokenResult.tokens.expires_in != null
          ? { expiresIn: tokenResult.tokens.expires_in }
          : {}),
        ...(tokenResult.tokens.scope != null
          ? { scopes: tokenResult.tokens.scope }
          : {}),
        channelTitle: channel.title,
        channelThumbnail: channel.thumbnail,
      });

      if (!storeResult.success) {
        return {
          success: false,
          redirectUrl: `/dashboard?error=youtube_db_failed`,
        };
      }

      // Create HMAC-signed session cookie (safe data only, no tokens)
      const payload = JSON.stringify({
        google_user_id: googleUserId,
        channel_title: channel.title,
        channel_thumbnail: channel.thumbnail,
        connected_at: new Date().toISOString(),
      });

      const signature = await hmacSign(payload, sessionSecret);
      const sessionValue = `${signature}.${base64urlEncode(payload)}`;

      setCookie("hey5050_youtube_session", sessionValue, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return { success: true, redirectUrl: "/dashboard" };
    },
  );

/**
 * Reads the HMAC-signed YouTube session cookie.
 */
export const getYouTubeSession = createServerFn({
  method: "GET" as const,
}).handler(async (): Promise<YouTubeSession> => {
  try {
    const sessionSecret = getSessionSecret();
    if (!sessionSecret) return { connected: false };

    const sessionValue = getCookie("hey5050_youtube_session");
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

    const expectedSignature = await hmacSign(payload, sessionSecret);

    // Constant-time comparison
    const sessionHexToBytes = (h: string): Uint8Array => {
      const bytes = new Uint8Array(h.length / 2);
      for (let i = 0; i < h.length; i += 2)
        bytes[i / 2] = parseInt(h.substring(i, i + 2), 16);
      return bytes;
    };
    const sessionConstantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
      if (a.byteLength !== b.byteLength) return false;
      let diff = 0;
      for (let i = 0; i < a.byteLength; i++) diff |= a[i]! ^ b[i]!;
      return diff === 0;
    };

    const receivedBytes = sessionHexToBytes(receivedSignature);
    const expectedBytes = sessionHexToBytes(expectedSignature);
    if (!sessionConstantTimeEqual(receivedBytes, expectedBytes)) {
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
      ...(typeof session["google_user_id"] === "string"
        ? { googleUserId: session["google_user_id"] }
        : {}),
      ...(typeof session["channel_title"] === "string"
        ? { channelTitle: session["channel_title"] }
        : {}),
      ...(typeof session["channel_thumbnail"] === "string"
        ? { channelThumbnail: session["channel_thumbnail"] }
        : {}),
    };
  } catch {
    return { connected: false };
  }
});

/**
 * Gets the connected YouTube account info from the database.
 */
export const getConnectedYouTubeAccount = createServerFn({
  method: "GET" as const,
}).handler(async () => {
  return getAccountInfo();
});

/**
 * Clears YouTube session cookie, database tokens, and OAuth state cookie.
 */
export const logoutYouTube = createServerFn({ method: "GET" as const }).handler(
  async (): Promise<{ success: boolean }> => {
    try {
      await removeTokens();
      deleteCookie("hey5050_youtube_session", { path: "/" });
      deleteCookie("hey5050_youtube_state", { path: "/" });
      return { success: true };
    } catch {
      return { success: false };
    }
  },
);
