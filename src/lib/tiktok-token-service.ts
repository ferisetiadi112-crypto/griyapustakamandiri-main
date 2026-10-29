/**
 * TikTokTokenService
 *
 * Centralized token management. All services that need a TikTok access token
 * must go through this service. Never access tokens directly from the database.
 *
 * Responsibilities:
 * - getValidAccessToken(): returns a valid token, refreshing if needed
 * - refreshAccessToken(): refreshes the token and persists it
 * - storeTokens(): saves tokens to the database
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tiktokAccount } from "@/db/schema";
import { refreshAccessToken as apiRefresh } from "@/lib/tiktok-client";

const CLIENT_KEY = process.env["TIKTOK_CLIENT_KEY"] ?? "";
const CLIENT_SECRET = process.env["TIKTOK_CLIENT_SECRET"] ?? "";

/**
 * Check if a token is expired or about to expire (within 5 minutes buffer).
 */
function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false; // No expiry set = treat as non-expired
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= expiresAt.getTime() - bufferMs;
}

/**
 * Get a valid access token for the single TikTok account.
 * Automatically refreshes if expired.
 *
 * Returns the access token on success, or an error.
 */
export async function getValidAccessToken(): Promise<
  { token: string } | { error: string }
> {
  const db = getDatabase();

  // Get the single account
  const account = await db.query.tiktokAccount.findFirst();
  if (!account) {
    return { error: "NO_ACCOUNT: No TikTok account is connected" };
  }

  // Check if token is still valid
  if (!isTokenExpired(account.tokenExpiresAt)) {
    return { token: account.accessToken };
  }

  // Token is expired — attempt refresh
  if (!account.refreshToken) {
    return {
      error:
        "TOKEN_REFRESH_FAILED: Token expired and no refresh token available. Please reconnect TikTok.",
    };
  }

  if (!CLIENT_KEY || !CLIENT_SECRET) {
    return {
      error:
        "CONFIG_MISSING: TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not configured",
    };
  }

  const result = await apiRefresh({
    refreshToken: account.refreshToken,
    clientKey: CLIENT_KEY,
    clientSecret: CLIENT_SECRET,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  // Persist the new tokens
  const newExpiresAt = result.tokens.expires_in
    ? new Date(Date.now() + result.tokens.expires_in * 1000)
    : null;

  await db
    .update(tiktokAccount)
    .set({
      accessToken: result.tokens.access_token,
      refreshToken: result.tokens.refresh_token ?? account.refreshToken,
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(tiktokAccount.id, account.id));

  return { token: result.tokens.access_token };
}

/**
 * Store initial tokens after successful OAuth.
 * Creates the account if it doesn't exist, or updates the existing one.
 */
export async function storeTokens(params: {
  openId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000)
    : null;

  // Check if account already exists
  const existing = await db.query.tiktokAccount.findFirst();

  if (existing) {
    // Update existing account
    await db
      .update(tiktokAccount)
      .set({
        tiktokOpenId: params.openId,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? existing.refreshToken,
        tokenExpiresAt: expiresAt,
        scopes: params.scopes ?? existing.scopes,
        displayName: params.displayName ?? existing.displayName,
        avatarUrl: params.avatarUrl ?? existing.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(tiktokAccount.id, existing.id));
  } else {
    // Single account constraint: only insert if no account exists
    await db.insert(tiktokAccount).values({
      tiktokOpenId: params.openId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken ?? null,
      tokenExpiresAt: expiresAt,
      scopes: params.scopes ?? "",
      displayName: params.displayName ?? "",
      avatarUrl: params.avatarUrl ?? "",
    });
  }

  return { success: true };
}

/**
 * Remove the stored tokens (disconnect account).
 */
export async function removeTokens(): Promise<void> {
  const db = getDatabase();
  await db.delete(tiktokAccount);
}

/**
 * Get account info without exposing tokens.
 */
export async function getAccountInfo(): Promise<
  | {
      connected: true;
      openId: string;
      displayName: string;
      avatarUrl: string;
      connectedAt: Date;
    }
  | { connected: false }
> {
  const db = getDatabase();
  const account = await db.query.tiktokAccount.findFirst();

  if (!account) {
    return { connected: false };
  }

  return {
    connected: true,
    openId: account.tiktokOpenId,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    connectedAt: account.connectedAt,
  };
}
