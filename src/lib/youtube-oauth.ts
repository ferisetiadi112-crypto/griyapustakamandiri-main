/**
 * YouTube OAuth utilities.
 * Uses Google OAuth 2.0 authorization code flow.
 * Reuses crypto utilities from tiktok-auth.ts for state/CSRF protection.
 */

import { generateState } from "@/lib/tiktok-auth";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Scopes: minimum required to verify identity and read channel info
export const YOUTUBE_SCOPES = [
  "openid",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

// ─── Types ──────────────────────────────────────────────────

export type YouTubeTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type YouTubeChannel = {
  id: string;
  title: string;
  thumbnail: string;
};

// ─── OAuth URL Construction ─────────────────────────────────

/**
 * Build the Google OAuth authorization URL.
 * Returns both the URL and the state token for CSRF protection.
 */
export function buildYouTubeAuthUrl(params: {
  clientId: string;
  redirectUri: string;
}): { url: string; state: string } {
  const state = generateState();

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return { url: url.toString(), state };
}

// ─── Token Exchange ─────────────────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 * Server-side only — never called from client code.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ tokens: YouTubeTokenResponse } | { error: string }> {
  const { code, clientId, clientSecret, redirectUri } = params;

  console.log("[YouTube:TokenExchange] request:", {
    client_id_length: clientId.length,
    client_id_present: !!clientId,
    redirect_uri: redirectUri,
    code_length: code.length,
  });

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;

    console.log("[YouTube:TokenExchange] response:", {
      status: response.status,
      has_error: !!data["error"],
      error_value: (data["error"] as string) ?? null,
      has_access_token: !!data["access_token"],
      has_refresh_token: !!data["refresh_token"],
    });

    if (!response.ok) {
      const errorDesc = (data["error_description"] as string) ?? (data["error"] as string) ?? "unknown";
      return { error: `TOKEN_EXCHANGE_FAILED: HTTP ${response.status} — ${errorDesc}` };
    }

    const accessToken = data["access_token"] as string | undefined;
    if (!accessToken) {
      return { error: "TOKEN_EXCHANGE_FAILED: no access_token in response" };
    }

    return {
      tokens: {
        access_token: accessToken,
        refresh_token: (data["refresh_token"] as string) ?? undefined,
        expires_in: (data["expires_in"] as number) ?? undefined,
        scope: (data["scope"] as string) ?? undefined,
        token_type: (data["token_type"] as string) ?? undefined,
        id_token: (data["id_token"] as string) ?? undefined,
      },
    };
  } catch (err) {
    return {
      error: `TOKEN_EXCHANGE_FAILED: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ─── Refresh Token ──────────────────────────────────────────

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ tokens: YouTubeTokenResponse } | { error: string }> {
  const { refreshToken, clientId, clientSecret } = params;

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return { error: `TOKEN_REFRESH_FAILED: HTTP ${response.status}` };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data["access_token"] as string | undefined;

    if (!accessToken) {
      return { error: "TOKEN_REFRESH_FAILED: no access_token in response" };
    }

    return {
      tokens: {
        access_token: accessToken,
        refresh_token: (data["refresh_token"] as string) ?? undefined,
        expires_in: (data["expires_in"] as number) ?? undefined,
        scope: (data["scope"] as string) ?? undefined,
        token_type: (data["token_type"] as string) ?? undefined,
      },
    };
  } catch (err) {
    return {
      error: `TOKEN_REFRESH_FAILED: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ─── Channel Info ───────────────────────────────────────────

/**
 * Fetch the authenticated user's YouTube channel info.
 * Uses YouTube Data API v3 channels.list with "mine" parameter.
 */
export async function getChannelInfo(accessToken: string): Promise<
  { channel: YouTubeChannel } | { error: string }
> {
  try {
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { error: `YOUTUBE_API_FAILED: HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          thumbnails?: {
            default?: { url?: string };
            medium?: { url?: string };
            high?: { url?: string };
          };
        };
      }>;
    };

    const item = data.items?.[0];
    if (!item?.id || !item?.snippet?.title) {
      return { error: "YOUTUBE_API_FAILED: no channel found" };
    }

    const thumbnail =
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      "";

    return {
      channel: {
        id: item.id,
        title: item.snippet.title,
        thumbnail,
      },
    };
  } catch (err) {
    return {
      error: `YOUTUBE_API_FAILED: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}
