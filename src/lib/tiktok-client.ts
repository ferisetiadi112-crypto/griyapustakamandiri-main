/**
 * Centralized TikTok API Client
 *
 * All authenticated TikTok API calls go through this client.
 * Never spread raw fetch calls to TikTok across the codebase.
 *
 * Every call obtains a valid access token from TikTokTokenService.
 * Tokens are never accepted from the browser.
 */

import { getValidAccessToken } from "@/lib/tiktok-token-service";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// ─── Types ──────────────────────────────────────────────────

export type TikTokUserProfile = {
  open_id: string;
  display_name: string;
  avatar_url: string;
  bio_description?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
  is_verified?: boolean;
};

export type TikTokTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type TikTokVideo = {
  id: string;
  create_time: string;
  title: string;
  cover_image_url: string;
  share_url: string;
  duration: number;
  height: number;
  width: number;
};

export type TikTokVideoStats = {
  id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
};

export type TikTokPaginatedResponse<T> = {
  data: {
    list: T[];
    cursor?: string;
    has_more?: boolean;
  };
};

export type TikTokErrorType =
  | "TIKTOK_NOT_CONNECTED"
  | "TIKTOK_AUTH_EXPIRED"
  | "TIKTOK_REAUTH_REQUIRED"
  | "TIKTOK_SCOPE_MISSING"
  | "TIKTOK_API_ERROR"
  | "TIKTOK_RATE_LIMITED"
  | "TIKTOK_CAPABILITY_UNAVAILABLE"
  | "TIKTOK_INVALID_RESPONSE";

export type TikTokApiError = {
  type: TikTokErrorType;
  message: string;
  httpStatus?: number;
  logId?: string;
};

export type TikTokApiResult<T> = { ok: true; data: T } | { ok: false; error: TikTokApiError };

// ─── Internal Helpers ───────────────────────────────────────

function classifyHttpError(
  status: number,
  body: Record<string, unknown>,
): TikTokApiError {
  const error = body["error"] as string | undefined;
  const message = body["message"] as string | undefined;
  const logId = body["log_id"] as string | undefined;

  if (status === 429) {
    return {
      type: "TIKTOK_RATE_LIMITED",
      message: "TikTok rate limit exceeded. Please try again later.",
      httpStatus: status,
      ...(logId != null ? { logId } : {}),
    };
  }

  if (status === 401 || status === 403) {
    // Check for scope-related errors
    if (error === "access_token_invalid" || error === "access_token_expired") {
      return {
        type: "TIKTOK_AUTH_EXPIRED",
        message: "TikTok access token has expired and could not be refreshed.",
        httpStatus: status,
        ...(logId != null ? { logId } : {}),
      };
    }
    if (error?.includes("scope") || message?.includes("scope")) {
      return {
        type: "TIKTOK_SCOPE_MISSING",
        message: `Missing required TikTok scope: ${message ?? error ?? "unknown"}`,
        httpStatus: status,
        ...(logId != null ? { logId } : {}),
      };
    }
    return {
      type: "TIKTOK_API_ERROR",
      message: `TikTok API authentication error: ${message ?? error ?? "unknown"}`,
      httpStatus: status,
      ...(logId != null ? { logId } : {}),
    };
  }

  return {
    type: "TIKTOK_API_ERROR",
    message: `TikTok API error (${status}): ${message ?? error ?? "unknown"}`,
    httpStatus: status,
    ...(logId != null ? { logId } : {}),
  };
}

/**
 * Generic authenticated GET request to TikTok API.
 * Obtains a valid access token through TikTokTokenService.
 * Never accepts an access token from the browser.
 */
async function tiktokApiGet<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<TikTokApiResult<T>> {
  // Obtain valid token server-side
  const tokenResult = await getValidAccessToken();
  if ("error" in tokenResult) {
    if (tokenResult.error.startsWith("NO_ACCOUNT")) {
      return { ok: false, error: { type: "TIKTOK_NOT_CONNECTED", message: tokenResult.error } };
    }
    if (tokenResult.error.includes("TOKEN_REFRESH_FAILED") || tokenResult.error.includes("reconnect")) {
      return { ok: false, error: { type: "TIKTOK_REAUTH_REQUIRED", message: tokenResult.error } };
    }
    return { ok: false, error: { type: "TIKTOK_API_ERROR", message: tokenResult.error } };
  }

  const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokenResult.token}` },
    });

    const body = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return { ok: false, error: classifyHttpError(response.status, body) };
    }

    // TikTok wraps successful responses in { data: ... }
    const data = body["data"] as T | undefined;
    if (data === undefined || data === null) {
      const logId = body["log_id"] as string | undefined;
      return {
        ok: false,
        error: {
          type: "TIKTOK_INVALID_RESPONSE",
          message: "TikTok returned an empty or unexpected response structure.",
          ...(logId != null ? { logId } : {}),
        },
      };
    }

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: {
        type: "TIKTOK_API_ERROR",
        message: `Network error calling TikTok API: ${err instanceof Error ? err.message : "unknown"}`,
      },
    };
  }
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Exchange an authorization code for access + refresh tokens.
 * This is a server-side only function — never called from client code.
 */
export async function exchangeCodeForToken(params: {
  code: string;
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ tokens: TikTokTokenResponse } | { error: string }> {
  const { code, clientKey, clientSecret, redirectUri } = params;

  // Diagnostic logging (no secrets exposed)
  console.log("[TokenExchange] request:", {
    client_key_length: clientKey.length,
    client_key_present: !!clientKey,
    client_secret_length: clientSecret.length,
    redirect_uri: redirectUri,
    code_length: code.length,
  });

  try {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const responseText = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      console.error("[TokenExchange] response not JSON:", {
        status: response.status,
        bodyPreview: responseText.substring(0, 200),
      });
      return { error: `TOKEN_EXCHANGE_FAILED: HTTP ${response.status} — response not JSON` };
    }

    console.log("[TokenExchange] response:", {
      status: response.status,
      has_error: !!data["error"],
      error_value: (data["error"] as string) ?? null,
      has_access_token: !!data["access_token"],
      message: (data["message"] as string) ?? null,
      error_description: (data["error_description"] as string) ?? null,
      log_id: (data["log_id"] as string) ?? null,
    });

    if (!response.ok) {
      return { error: `TOKEN_EXCHANGE_FAILED: HTTP ${response.status}` };
    }

    const error = data["error"] as string | undefined;
    const accessToken = data["access_token"] as string | undefined;

    if (error || !accessToken) {
      return {
        error: `TOKEN_EXCHANGE_FAILED: ${error ?? "no access_token in response"}`,
      };
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
      error: `TOKEN_EXCHANGE_FAILED: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientKey: string;
  clientSecret: string;
}): Promise<{ tokens: TikTokTokenResponse } | { error: string }> {
  const { refreshToken, clientKey, clientSecret } = params;

  try {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return { error: `TOKEN_REFRESH_FAILED: HTTP ${response.status}` };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const error = data["error"] as string | undefined;
    const accessToken = data["access_token"] as string | undefined;

    if (error || !accessToken) {
      return {
        error: `TOKEN_REFRESH_FAILED: ${error ?? "no access_token in response"}`,
      };
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

/**
 * Fetch the authenticated user's profile.
 * Requires a valid access token (obtained server-side).
 */
export async function getUserProfile(accessToken: string): Promise<
  | { user: TikTokUserProfile }
  | { error: string }
> {
  try {
    const response = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,avatar_url`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      return { error: `TIKTOK_API_FAILED: HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      error?: unknown;
      data?: { user?: TikTokUserProfile };
    };

    if (data.error || !data.data?.user) {
      return { error: "TIKTOK_API_FAILED: user info not available" };
    }

    return { user: data.data.user };
  } catch (err) {
    return {
      error: `TIKTOK_API_FAILED: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ─── Authenticated API Methods (use tiktokApiGet) ───────────

/**
 * Get the authenticated user's full profile via the centralized API client.
 * Returns only fields that are actually available through granted scopes.
 */
export async function getFullProfile(): Promise<TikTokApiResult<TikTokUserProfile>> {
  return tiktokApiGet<TikTokUserProfile>("/user/info/", {
    fields: "open_id,display_name,avatar_url,bio_description,follower_count,following_count,likes_count,video_count,is_verified",
  });
}

/**
 * Get the authenticated user's videos.
 * Requires video.list scope.
 */
export async function getUserVideos(params?: {
  maxCount?: number;
  cursor?: string;
}): Promise<TikTokApiResult<TikTokPaginatedResponse<TikTokVideo>>> {
  const queryParams: Record<string, string> = {
    fields: "id,create_time,title,cover_image_url,share_url,duration,height,width",
  };
  if (params?.maxCount) {
    queryParams["max_count"] = String(params.maxCount);
  }
  if (params?.cursor) {
    queryParams["cursor"] = params.cursor;
  }
  return tiktokApiGet<TikTokPaginatedResponse<TikTokVideo>>("/video/list/", queryParams);
}

/**
 * Get video stats for specific videos.
 * Requires video.stats scope.
 */
export async function getVideoStats(videoIds: string[]): Promise<
  TikTokApiResult<{ list: TikTokVideoStats[] }>
> {
  if (videoIds.length === 0) {
    return { ok: true, data: { list: [] } };
  }
  return tiktokApiGet<{ list: TikTokVideoStats[] }>("/video/list/", {
    fields: "id,view_count,like_count,comment_count,share_count,save_count",
    video_ids: videoIds.join(","),
  });
}
