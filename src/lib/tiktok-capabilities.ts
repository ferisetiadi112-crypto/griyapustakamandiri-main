/**
 * TikTok Capability Discovery
 *
 * Determines which TikTok API capabilities are available for the
 * currently connected account based on granted scopes and implemented endpoints.
 *
 * Does NOT perform destructive actions to test capabilities.
 * Write capabilities are assessed via scope analysis and API documentation.
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tiktokAccount } from "@/db/schema";

// ─── Types ──────────────────────────────────────────────────

export type CapabilityStatus =
  | "available"
  | "unavailable"
  | "requires_permission"
  | "not_implemented"
  | "unknown";

export type CapabilityInfo = {
  id: string;
  name: string;
  description: string;
  status: CapabilityStatus;
  tiktokScope: string | null;
  endpoint: string | null;
  reason: string | null;
};

export type CapabilityReport = {
  capabilities: CapabilityInfo[];
  connectedAt: string | null;
  scopesGranted: string[];
  assessedAt: string;
};

// ─── Capability Definitions ─────────────────────────────────

type CapabilityDefinition = {
  id: string;
  name: string;
  description: string;
  tiktokScope: string | null;
  endpoint: string | null;
  /**
   * Determines status based on granted scopes and implementation state.
   * Return null if you cannot determine status (defaults to "unknown").
   */
  assess: (grantedScopes: Set<string>, implemented: boolean) => CapabilityStatus;
};

const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  {
    id: "profile_read",
    name: "Read Profile",
    description: "Read basic profile information (name, avatar)",
    tiktokScope: "user.info.basic",
    endpoint: "/v2/user/info/",
    assess: (scopes) => (scopes.has("user.info.basic") ? "available" : "requires_permission"),
  },
  {
    id: "video_read",
    name: "Read Videos",
    description: "List and read own videos",
    tiktokScope: "video.list",
    endpoint: "/v2/video/list/",
    assess: (scopes, impl) => {
      if (!impl) return "not_implemented";
      return scopes.has("video.list") ? "available" : "requires_permission";
    },
  },
  {
    id: "analytics_read",
    name: "Read Analytics",
    description: "Read video and account analytics",
    tiktokScope: "video.stats",
    endpoint: "/v2/video/list/ (with stats fields)",
    assess: (scopes, impl) => {
      if (!impl) return "not_implemented";
      return scopes.has("video.stats") ? "available" : "requires_permission";
    },
  },
  {
    id: "upload",
    name: "Upload Video",
    description: "Upload video content to TikTok",
    tiktokScope: "video.upload",
    endpoint: "/v2/post/publish/video/init/",
    assess: () => "not_implemented",
  },
  {
    id: "direct_post",
    name: "Direct Post",
    description: "Post video directly without user interaction",
    tiktokScope: "video.publish",
    endpoint: "/v2/post/publish/video/init/",
    assess: () => "not_implemented",
  },
  {
    id: "comments_read",
    name: "Read Comments",
    description: "Read comments on own videos",
    tiktokScope: "comment.list",
    endpoint: "/v2/comment/list/",
    assess: () => "not_implemented",
  },
  {
    id: "comment_reply",
    name: "Reply to Comments",
    description: "Reply to comments on own videos",
    tiktokScope: "comment.create",
    endpoint: "/v2/comment/publish/",
    assess: () => "not_implemented",
  },
  {
    id: "like",
    name: "Like Content",
    description: "Like videos on TikTok",
    tiktokScope: "like.list",
    endpoint: null,
    assess: () => "not_implemented",
  },
  {
    id: "dm",
    name: "Direct Messages",
    description: "Send and receive direct messages",
    tiktokScope: "message.list",
    endpoint: null,
    assess: () => "not_implemented",
  },
  {
    id: "bio_update",
    name: "Update Bio",
    description: "Update account bio/description",
    tiktokScope: "user.info.profile",
    endpoint: null,
    assess: () => "not_implemented",
  },
  {
    id: "profile_update",
    name: "Update Profile",
    description: "Update profile image, display name",
    tiktokScope: "user.info.profile",
    endpoint: null,
    assess: () => "not_implemented",
  },
];

// ─── Scope Parsing ──────────────────────────────────────────

/**
 * Parse a TikTok scopes string into a Set of individual scope names.
 * TikTok returns scopes as a space-separated string.
 */
function parseScopes(scopesString: string): Set<string> {
  if (!scopesString) return new Set();
  return new Set(
    scopesString
      .split(" ")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Assess all capabilities for the connected account.
 * Returns a complete capability report with honest status for each capability.
 *
 * This is a read-only operation — no destructive actions are performed.
 */
export async function discoverCapabilities(): Promise<CapabilityReport> {
  const db = getDatabase();
  const account = await db.query.tiktokAccount.findFirst();

  if (!account) {
    return {
      capabilities: CAPABILITY_DEFINITIONS.map((def) => ({
        id: def.id,
        name: def.name,
        description: def.description,
        status: "unavailable" as CapabilityStatus,
        tiktokScope: def.tiktokScope,
        endpoint: def.endpoint,
        reason: "No TikTok account connected",
      })),
      connectedAt: null,
      scopesGranted: [],
      assessedAt: new Date().toISOString(),
    };
  }

  const grantedScopes = parseScopes(account.scopes);
  const scopesArray = Array.from(grantedScopes);

  // For video_read and analytics_read, we have implemented the client methods.
  // They are "available" if the scope is granted.
  // For analytics, the fields may only be available with video.stats scope.
  const implementedCapabilities = new Set(["profile_read", "video_read", "analytics_read"]);

  const capabilities: CapabilityInfo[] = CAPABILITY_DEFINITIONS.map((def) => {
    const implemented = implementedCapabilities.has(def.id);
    const status = def.assess(grantedScopes, implemented);

    let reason: string | null = null;
    if (status === "requires_permission") {
      reason = `Requires '${def.tiktokScope}' scope. Request this scope in TikTok Developer Portal.`;
    } else if (status === "not_implemented") {
      reason = "Not yet implemented in this application.";
    } else if (status === "unavailable") {
      reason = "API capability not available.";
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      status,
      tiktokScope: def.tiktokScope,
      endpoint: def.endpoint,
      reason,
    };
  });

  return {
    capabilities,
    connectedAt: account.connectedAt?.toISOString() ?? null,
    scopesGranted: scopesArray,
    assessedAt: new Date().toISOString(),
  };
}

/**
 * Get a specific capability's status.
 */
export async function getCapabilityStatus(capabilityId: string): Promise<CapabilityInfo | null> {
  const report = await discoverCapabilities();
  return report.capabilities.find((c) => c.id === capabilityId) ?? null;
}

/**
 * Check if a specific capability is available for the connected account.
 */
export async function isCapabilityAvailable(capabilityId: string): Promise<boolean> {
  const cap = await getCapabilityStatus(capabilityId);
  return cap?.status === "available";
}

/**
 * Get all available capabilities (status === "available").
 */
export async function getAvailableCapabilities(): Promise<CapabilityInfo[]> {
  const report = await discoverCapabilities();
  return report.capabilities.filter((c) => c.status === "available");
}

/**
 * Get all capabilities that require additional permissions.
 */
export async function getRequiredPermissionCapabilities(): Promise<CapabilityInfo[]> {
  const report = await discoverCapabilities();
  return report.capabilities.filter((c) => c.status === "requires_permission");
}
