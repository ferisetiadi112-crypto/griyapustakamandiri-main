/**
 * Capability Registry
 *
 * Tracks which TikTok API capabilities are available, unavailable,
 * or not yet implemented. The AI system will consult this registry
 * before attempting any action.
 */

export type CapabilityStatus =
  | "available"
  | "unavailable"
  | "requires_permission"
  | "not_implemented"
  | "unknown";

export type Capability = {
  id: string;
  name: string;
  description: string;
  status: CapabilityStatus;
  tiktokScope?: string;
  notes?: string;
};

/**
 * Registry of all known TikTok capabilities.
 * Status is determined by what the TikTok Developer Portal approves
 * and what we have implemented.
 */
export const TIKTOK_CAPABILITIES: Capability[] = [
  {
    id: "profile_read",
    name: "Read Profile",
    description: "Read basic profile information (name, avatar)",
    status: "available",
    tiktokScope: "user.info.basic",
  },
  {
    id: "video_read",
    name: "Read Videos",
    description: "List and read own videos",
    status: "requires_permission",
    tiktokScope: "video.list",
    notes: "Requires video.list scope approval from TikTok",
  },
  {
    id: "analytics_read",
    name: "Read Analytics",
    description: "Read video and account analytics",
    status: "requires_permission",
    tiktokScope: "video.stats",
    notes: "Requires video.stats scope approval from TikTok",
  },
  {
    id: "upload",
    name: "Upload Video",
    description: "Upload video content to TikTok",
    status: "requires_permission",
    tiktokScope: "video.upload",
    notes: "Requires video.upload scope approval from TikTok",
  },
  {
    id: "direct_post",
    name: "Direct Post",
    description: "Post video directly without user interaction",
    status: "requires_permission",
    tiktokScope: "video.publish",
    notes: "Requires video.publish scope and app review",
  },
  {
    id: "comments",
    name: "Read Comments",
    description: "Read comments on own videos",
    status: "not_implemented",
    tiktokScope: "comment.list",
  },
  {
    id: "comment_reply",
    name: "Reply to Comments",
    description: "Reply to comments on own videos",
    status: "not_implemented",
    tiktokScope: "comment.create",
  },
  {
    id: "like",
    name: "Like Content",
    description: "Like videos on TikTok",
    status: "not_implemented",
    tiktokScope: "like.list",
  },
  {
    id: "dm",
    name: "Direct Messages",
    description: "Send and receive direct messages",
    status: "not_implemented",
    tiktokScope: "message.list",
  },
  {
    id: "bio_update",
    name: "Update Bio",
    description: "Update account bio/description",
    status: "not_implemented",
    tiktokScope: "user.info.profile",
    notes: "May require additional scopes",
  },
  {
    id: "profile_update",
    name: "Update Profile",
    description: "Update profile image, display name",
    status: "not_implemented",
    tiktokScope: "user.info.profile",
  },
];

/**
 * Get a capability by ID.
 */
export function getCapability(id: string): Capability | undefined {
  return TIKTOK_CAPABILITIES.find((c) => c.id === id);
}

/**
 * Get all capabilities with a given status.
 */
export function getCapabilitiesByStatus(
  status: CapabilityStatus,
): Capability[] {
  return TIKTOK_CAPABILITIES.filter((c) => c.status === status);
}

/**
 * Check if a capability is usable (status is "available").
 */
export function isCapabilityAvailable(id: string): boolean {
  const cap = getCapability(id);
  return cap?.status === "available";
}
