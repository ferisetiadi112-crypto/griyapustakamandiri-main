/**
 * Capability Registry Tests
 *
 * Tests capability discovery logic with mocked database.
 * No real TikTok API or database needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the database ──

const mockAccount = {
  id: 1,
  tiktokOpenId: "test_user",
  displayName: "Test User",
  avatarUrl: "",
  accessToken: "token",
  refreshToken: "refresh",
  tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
  scopes: "user.info.basic video.list",
  connectedAt: new Date(),
  updatedAt: new Date(),
};

const mockDb = {
  query: {
    tiktokAccount: {
      findFirst: vi.fn().mockResolvedValue(mockAccount),
    },
  },
};

vi.mock("@/lib/db", () => ({
  getDatabase: () => mockDb,
}));

import {
  discoverCapabilities,
  getCapabilityStatus,
  isCapabilityAvailable,
} from "@/lib/tiktok-capabilities";

describe("Capability Discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.query.tiktokAccount.findFirst.mockResolvedValue(mockAccount);
  });

  it("returns capabilities for connected account", async () => {
    const report = await discoverCapabilities();
    expect(report.capabilities.length).toBeGreaterThan(0);
    expect(report.connectedAt).not.toBeNull();
  });

  it("marks profile_read as available with user.info.basic scope", async () => {
    const report = await discoverCapabilities();
    const profileCap = report.capabilities.find((c) => c.id === "profile_read");
    expect(profileCap).toBeDefined();
    expect(profileCap!.status).toBe("available");
  });

  it("marks video_read as available with video.list scope", async () => {
    const report = await discoverCapabilities();
    const videoCap = report.capabilities.find((c) => c.id === "video_read");
    expect(videoCap).toBeDefined();
    expect(videoCap!.status).toBe("available");
  });

  it("marks analytics_read as requires_permission without video.stats scope", async () => {
    // Account scopes only have user.info.basic and video.list, not video.stats
    const report = await discoverCapabilities();
    const analyticsCap = report.capabilities.find((c) => c.id === "analytics_read");
    expect(analyticsCap).toBeDefined();
    expect(analyticsCap!.status).toBe("requires_permission");
  });

  it("marks upload as not_implemented", async () => {
    const report = await discoverCapabilities();
    const uploadCap = report.capabilities.find((c) => c.id === "upload");
    expect(uploadCap).toBeDefined();
    expect(uploadCap!.status).toBe("not_implemented");
  });

  it("marks direct_post as not_implemented", async () => {
    const report = await discoverCapabilities();
    const dpCap = report.capabilities.find((c) => c.id === "direct_post");
    expect(dpCap).toBeDefined();
    expect(dpCap!.status).toBe("not_implemented");
  });

  it("marks like as not_implemented", async () => {
    const report = await discoverCapabilities();
    const likeCap = report.capabilities.find((c) => c.id === "like");
    expect(likeCap).toBeDefined();
    expect(likeCap!.status).toBe("not_implemented");
  });

  it("marks dm as not_implemented", async () => {
    const report = await discoverCapabilities();
    const dmCap = report.capabilities.find((c) => c.id === "dm");
    expect(dmCap).toBeDefined();
    expect(dmCap!.status).toBe("not_implemented");
  });

  it("includes reason for non-available capabilities", async () => {
    const report = await discoverCapabilities();
    const notImplCaps = report.capabilities.filter(
      (c) => c.status === "not_implemented",
    );
    for (const cap of notImplCaps) {
      expect(cap.reason).toBeTruthy();
    }
  });

  it("returns all capabilities as unavailable when no account connected", async () => {
    mockDb.query.tiktokAccount.findFirst.mockResolvedValue(null);
    const report = await discoverCapabilities();
    for (const cap of report.capabilities) {
      expect(cap.status).toBe("unavailable");
    }
    expect(report.connectedAt).toBeNull();
  });

  it("getCapabilityStatus returns specific capability", async () => {
    const cap = await getCapabilityStatus("profile_read");
    expect(cap).not.toBeNull();
    expect(cap!.id).toBe("profile_read");
  });

  it("getCapabilityStatus returns null for unknown capability", async () => {
    const cap = await getCapabilityStatus("nonexistent");
    expect(cap).toBeNull();
  });

  it("isCapabilityAvailable returns true for available capability", async () => {
    const available = await isCapabilityAvailable("profile_read");
    expect(available).toBe(true);
  });

  it("isCapabilityAvailable returns false for not_implemented", async () => {
    const available = await isCapabilityAvailable("upload");
    expect(available).toBe(false);
  });

  it("no capability is marked as available when account is not connected", async () => {
    mockDb.query.tiktokAccount.findFirst.mockResolvedValue(null);
    const available = await isCapabilityAvailable("profile_read");
    expect(available).toBe(false);
  });

  it("scopes are parsed from the account data", async () => {
    const report = await discoverCapabilities();
    expect(report.scopesGranted).toContain("user.info.basic");
    expect(report.scopesGranted).toContain("video.list");
  });
});
