/**
 * Account Tests
 *
 * Verifies single-account enforcement at the application layer.
 * Uses mocked database — no real Neon connection needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the database module before importing anything that uses it ──

const mockAccount: {
  id: number;
  tiktokOpenId: string;
  displayName: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string;
  connectedAt: Date;
  updatedAt: Date;
} | null = { id: 1, tiktokOpenId: "test_open_id", displayName: "Test User", avatarUrl: "", accessToken: "at_123", refreshToken: "rt_456", tokenExpiresAt: null, scopes: "user.info.basic", connectedAt: new Date(), updatedAt: new Date() };

const mockDb = {
  query: {
    tiktokAccount: {
      findFirst: vi.fn().mockResolvedValue(mockAccount),
    },
  },
  insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
  delete: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/db", () => ({
  getDatabase: () => mockDb,
}));

// Now import the token service (will use the mocked db)
import { storeTokens, getAccountInfo, removeTokens } from "@/lib/tiktok-token-service";

describe("Account — Single Account Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset findFirst to return existing account by default
    mockDb.query.tiktokAccount.findFirst.mockResolvedValue(mockAccount);
  });

  it("first account can be stored", async () => {
    // Simulate no existing account
    mockDb.query.tiktokAccount.findFirst.mockResolvedValueOnce(null);

    const result = await storeTokens({
      openId: "new_open_id",
      accessToken: "new_access_token",
      refreshToken: "new_refresh_token",
      expiresIn: 3600,
      scopes: "user.info.basic",
      displayName: "New User",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("second account is prevented — existing account is updated instead", async () => {
    // Existing account is returned (mockAccount is set)
    const result = await storeTokens({
      openId: "different_open_id",
      accessToken: "different_token",
      refreshToken: "different_refresh",
      expiresIn: 7200,
      scopes: "user.info.basic",
      displayName: "Different User",
      avatarUrl: "",
    });

    expect(result.success).toBe(true);
    // Should NOT insert a new row — should update existing
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("existing account can be updated", async () => {
    const result = await storeTokens({
      openId: "test_open_id",
      accessToken: "refreshed_token",
      refreshToken: "refreshed_refresh",
      expiresIn: 3600,
      scopes: "user.info.basic",
      displayName: "Updated Name",
      avatarUrl: "https://example.com/new.jpg",
    });

    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("getAccountInfo returns safe data without tokens", async () => {
    const info = await getAccountInfo();
    expect(info.connected).toBe(true);
    if (info.connected) {
      expect(info.displayName).toBeDefined();
      expect(info.avatarUrl).toBeDefined();
      // Must NOT contain tokens
      expect(info).not.toHaveProperty("accessToken");
      expect(info).not.toHaveProperty("refreshToken");
    }
  });

  it("getAccountInfo returns disconnected when no account", async () => {
    mockDb.query.tiktokAccount.findFirst.mockResolvedValueOnce(null);
    const info = await getAccountInfo();
    expect(info.connected).toBe(false);
  });

  it("removeTokens clears the account", async () => {
    await removeTokens();
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
