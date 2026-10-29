/**
 * TikTok API Client Tests
 *
 * Tests the centralized API client error handling and response parsing.
 * Uses mocked fetch — no real TikTok API calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock the token service to return a valid token ──

vi.mock("@/lib/tiktok-token-service", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue({ token: "mock_token_123" }),
}));

// Now import after mocks
import { getFullProfile, getUserVideos, getVideoStats } from "@/lib/tiktok-client";

describe("TikTok API Client — Response Handling", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns data on valid API response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            open_id: "user_123",
            display_name: "Test User",
            avatar_url: "https://example.com/avatar.jpg",
          },
        }),
    });

    const result = await getFullProfile();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.open_id).toBe("user_123");
      expect(result.data.display_name).toBe("Test User");
    }
  });

  it("returns rate limit error for HTTP 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "rate_limit_exceeded",
          message: "Too many requests",
          log_id: "abc123",
        }),
    });

    const result = await getFullProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("TIKTOK_RATE_LIMITED");
      expect(result.error.httpStatus).toBe(429);
    }
  });

  it("returns auth expired for 401 with invalid token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: "access_token_invalid",
          message: "Token is invalid",
        }),
    });

    const result = await getFullProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("TIKTOK_AUTH_EXPIRED");
    }
  });

  it("returns scope missing for 403 with scope error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: "scope_permission_denied",
          message: "Missing scope: video.list",
        }),
    });

    const result = await getUserVideos();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("TIKTOK_SCOPE_MISSING");
      expect(result.error.message).toContain("video.list");
    }
  });

  it("returns invalid response for empty data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await getFullProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("TIKTOK_INVALID_RESPONSE");
    }
  });

  it("returns API error for network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await getFullProfile();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe("TIKTOK_API_ERROR");
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns empty list for getVideoStats with no IDs", async () => {
    const result = await getVideoStats([]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.list).toEqual([]);
    }
  });

  it("does not expose tokens in API responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { open_id: "user_123", display_name: "Test" },
        }),
    });

    const result = await getFullProfile();
    expect(result.ok).toBe(true);
    if (result.ok) {
      // The data should only contain profile fields, not tokens
      expect(result.data).not.toHaveProperty("access_token");
      expect(result.data).not.toHaveProperty("refresh_token");
    }
  });
});
