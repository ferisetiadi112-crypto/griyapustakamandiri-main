/**
 * YouTube Token Service
 *
 * Centralized YouTube token management. Mirrors TikTokTokenService pattern.
 * All services that need a YouTube access token must go through this service.
 *
 * Responsibilities:
 * - getValidAccessToken(): returns a valid token, refreshing if needed
 * - refreshAccessToken(): refreshes the token and persists it
 * - storeTokens(): saves tokens to the database
 * - removeTokens(): disconnects the account
 * - getAccountInfo(): returns safe account info without tokens
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { youtubeAccount } from "@/db/schema";
import { refreshAccessToken as apiRefresh } from "@/lib/youtube-oauth";

const CLIENT_ID = process.env["YOUTUBE_CLIENT_ID"] ?? "";
const CLIENT_SECRET = process.env["YOUTUBE_CLIENT_SECRET"] ?? "";

/**
 * Check if a token is expired or about to expire (within 5 minutes buffer).
 */
function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= expiresAt.getTime() - bufferMs;
}

/**
 * Get a valid access token for the single YouTube account.
 * Automatically refreshes if expired.
 */
export async function getValidAccessToken(): Promise<
  { token: string } | { error: string }
> {
  const db = getDatabase();
  const account = await db.query.youtubeAccount.findFirst();

  if (!account) {
    return { error: "NO_ACCOUNT: No YouTube account is connected" };
  }

  if (!isTokenExpired(account.tokenExpiresAt)) {
    return { token: account.accessToken };
  }

  if (!account.refreshToken) {
    return {
      error:
        "TOKEN_REFRESH_FAILED: Token expired and no refresh token available. Please reconnect YouTube.",
    };
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      error: "CONFIG_MISSING: YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET not configured",
    };
  }

  const result = await apiRefresh({
    refreshToken: account.refreshToken,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  const newExpiresAt = result.tokens.expires_in
    ? new Date(Date.now() + result.tokens.expires_in * 1000)
    : null;

  await db
    .update(youtubeAccount)
    .set({
      accessToken: result.tokens.access_token,
      refreshToken: result.tokens.refresh_token ?? account.refreshToken,
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(youtubeAccount.id, account.id));

  return { token: result.tokens.access_token };
}

/**
 * Store initial tokens after successful OAuth.
 */
export async function storeTokens(params: {
  googleUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string;
  channelTitle?: string;
  channelThumbnail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000)
    : null;

  const existing = await db.query.youtubeAccount.findFirst();

  if (existing) {
    await db
      .update(youtubeAccount)
      .set({
        googleUserId: params.googleUserId,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? existing.refreshToken,
        tokenExpiresAt: expiresAt,
        scopes: params.scopes ?? existing.scopes,
        channelTitle: params.channelTitle ?? existing.channelTitle,
        channelThumbnail: params.channelThumbnail ?? existing.channelThumbnail,
        updatedAt: new Date(),
      })
      .where(eq(youtubeAccount.id, existing.id));
  } else {
    await db.insert(youtubeAccount).values({
      googleUserId: params.googleUserId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken ?? null,
      tokenExpiresAt: expiresAt,
      scopes: params.scopes ?? "",
      channelTitle: params.channelTitle ?? "",
      channelThumbnail: params.channelThumbnail ?? "",
    });
  }

  return { success: true };
}

/**
 * Remove the stored tokens (disconnect account).
 */
export async function removeTokens(): Promise<void> {
  const db = getDatabase();
  await db.delete(youtubeAccount);
}

/**
 * Get account info without exposing tokens.
 */
export async function getAccountInfo(): Promise<
  | {
      connected: true;
      googleUserId: string;
      channelTitle: string;
      channelThumbnail: string;
      connectedAt: Date;
    }
  | { connected: false }
> {
  const db = getDatabase();
  const account = await db.query.youtubeAccount.findFirst();

  if (!account) {
    return { connected: false };
  }

  return {
    connected: true,
    googleUserId: account.googleUserId,
    channelTitle: account.channelTitle,
    channelThumbnail: account.channelThumbnail,
    connectedAt: account.connectedAt,
  };
}
