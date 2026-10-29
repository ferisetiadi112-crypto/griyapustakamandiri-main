/**
 * TikTok Account Service
 *
 * Server-side service responsible for obtaining the current TikTok account state.
 * Returns safe data only — never exposes tokens or secrets.
 */

import { getAccountInfo, getValidAccessToken } from "@/lib/tiktok-token-service";
import { getFullProfile } from "@/lib/tiktok-client";

// ─── Types ──────────────────────────────────────────────────

export type AccountStatus =
  | "connected"
  | "connected_limited"
  | "reauthorization_required"
  | "not_connected";

export type SafeAccountData = {
  status: AccountStatus;
  displayName: string | null;
  avatarUrl: string | null;
  openId: string | null;
  connectedAt: string | null;
  scopes: string[];
  profile: {
    bioDescription: string | null;
    followerCount: number | null;
    followingCount: number | null;
    likesCount: number | null;
    videoCount: number | null;
    isVerified: boolean | null;
  };
};

// ─── Service ────────────────────────────────────────────────

/**
 * Get the current connected account state.
 * Attempts to refresh profile data from TikTok API.
 * Returns safe data only.
 */
export async function getAccountState(): Promise<SafeAccountData> {
  const accountInfo = await getAccountInfo();

  if (!accountInfo.connected) {
    return {
      status: "not_connected",
      displayName: null,
      avatarUrl: null,
      openId: null,
      connectedAt: null,
      scopes: [],
      profile: {
        bioDescription: null,
        followerCount: null,
        followingCount: null,
        likesCount: null,
        videoCount: null,
        isVerified: null,
      },
    };
  }

  // Check if token is valid
  const tokenResult = await getValidAccessToken();
  let status: AccountStatus = "connected";

  if ("error" in tokenResult) {
    if (tokenResult.error.includes("REAUTH") || tokenResult.error.includes("reconnect")) {
      status = "reauthorization_required";
    } else {
      status = "connected_limited";
    }
  }

  // Attempt to get full profile from TikTok API
  let profile = {
    bioDescription: null as string | null,
    followerCount: null as number | null,
    followingCount: null as number | null,
    likesCount: null as number | null,
    videoCount: null as number | null,
    isVerified: null as boolean | null,
  };

  if ("token" in tokenResult) {
    const profileResult = await getFullProfile();
    if (profileResult.ok) {
      const p = profileResult.data;
      profile = {
        bioDescription: p.bio_description ?? null,
        followerCount: p.follower_count ?? null,
        followingCount: p.following_count ?? null,
        likesCount: p.likes_count ?? null,
        videoCount: p.video_count ?? null,
        isVerified: p.is_verified ?? null,
      };

      // If profile fetch failed due to scope issues, mark as limited
    } else if (profileResult.error.type === "TIKTOK_SCOPE_MISSING") {
      status = "connected_limited";
    }
  }

  // Parse scopes from stored account
  const scopesStr = ""; // We don't expose scopes from getAccountInfo
  // The scopes are stored in the database but getAccountInfo doesn't return them
  // We'll parse them if needed from the raw account data

  return {
    status,
    displayName: accountInfo.displayName,
    avatarUrl: accountInfo.avatarUrl,
    openId: accountInfo.openId,
    connectedAt: accountInfo.connectedAt.toISOString(),
    scopes: scopesStr.split(" ").filter((s) => s.length > 0),
    profile,
  };
}
