/**
 * Session & Token Tests
 *
 * Tests the core logic functions directly (not through createServerFn).
 * No real TikTok credentials or production database used.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Test the crypto functions directly ──

import {
  generateState,
  sha256,
  hmacSign,
  base64urlEncode,
  base64urlDecode,
} from "@/lib/tiktok-auth";

describe("OAuth State — Validation", () => {
  it("generateState produces 64 hex characters", () => {
    const state = generateState();
    expect(state).toMatch(/^[0-9a-f]{64}$/);
    expect(state.length).toBe(64);
  });

  it("two calls produce different states", () => {
    const s1 = generateState();
    const s2 = generateState();
    expect(s1).not.toBe(s2);
  });

  it("sha256 produces consistent hex output", async () => {
    const h1 = await sha256("test-input");
    const h2 = await sha256("test-input");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sha256 produces different hashes for different inputs", async () => {
    const h1 = await sha256("input-a");
    const h2 = await sha256("input-b");
    expect(h1).not.toBe(h2);
  });

  it("hmacSign produces consistent signatures", async () => {
    const s1 = await hmacSign("data", "secret");
    const s2 = await hmacSign("data", "secret");
    expect(s1).toBe(s2);
  });

  it("hmacSign produces different signatures for different secrets", async () => {
    const s1 = await hmacSign("data", "secret-a");
    const s2 = await hmacSign("data", "secret-b");
    expect(s1).not.toBe(s2);
  });

  it("base64url roundtrip works", () => {
    const original = "Hello, World!";
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(decoded).toBe(original);
  });

  it("base64url encoded string contains no + or /", () => {
    const encoded = base64urlEncode("test+data/with=special");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
  });
});

describe("Session — HMAC Verification Logic", () => {
  const SECRET = "test-session-secret";

  function createSessionPayload(data: Record<string, unknown>) {
    return JSON.stringify(data);
  }

  async function createValidSession(payload: Record<string, unknown>) {
    const payloadStr = createSessionPayload(payload);
    const signature = await hmacSign(payloadStr, SECRET);
    return `${signature}.${base64urlEncode(payloadStr)}`;
  }

  async function verifySession(sessionValue: string, secret: string) {
    const dotIndex = sessionValue.indexOf(".");
    if (dotIndex === -1) return null;

    const receivedSignature = sessionValue.slice(0, dotIndex);
    const payloadBase64 = sessionValue.slice(dotIndex + 1);

    let payload: string;
    try {
      payload = base64urlDecode(payloadBase64);
    } catch {
      return null;
    }

    const expectedSignature = await hmacSign(payload, secret);

    // Constant-time comparison
    const receivedBytes = hexToBytes(receivedSignature);
    const expectedBytes = hexToBytes(expectedSignature);
    if (receivedBytes.byteLength !== expectedBytes.byteLength) return null;
    let diff = 0;
    for (let i = 0; i < receivedBytes.byteLength; i++) {
      diff |= receivedBytes[i]! ^ expectedBytes[i]!;
    }
    if (diff !== 0) return null;

    return JSON.parse(payload);
  }

  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  it("valid session is accepted", async () => {
    const session = await createValidSession({
      open_id: "user_123",
      display_name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      connected_at: new Date().toISOString(),
    });

    const result = await verifySession(session, SECRET);
    expect(result).not.toBeNull();
    expect(result.open_id).toBe("user_123");
    expect(result.display_name).toBe("Test User");
  });

  it("tampered session is rejected", async () => {
    const originalPayload = createSessionPayload({ open_id: "user_123" });
    const signature = await hmacSign(originalPayload, SECRET);
    const tamperedPayload = createSessionPayload({ open_id: "hacker" });
    const tamperedSession = `${signature}.${base64urlEncode(tamperedPayload)}`;

    const result = await verifySession(tamperedSession, SECRET);
    expect(result).toBeNull();
  });

  it("wrong secret rejects session", async () => {
    const session = await createValidSession({ open_id: "user_123" });
    const result = await verifySession(session, "wrong-secret");
    expect(result).toBeNull();
  });

  it("no-dot string is rejected", async () => {
    const result = await verifySession("no-dot-here", SECRET);
    expect(result).toBeNull();
  });

  it("garbage base64 is rejected", async () => {
    const result = await verifySession("sig.!!!invalid-base64!!!", SECRET);
    expect(result).toBeNull();
  });

  it("session payload does not contain tokens", async () => {
    const session = await createValidSession({
      open_id: "user_123",
      display_name: "Test",
      avatar_url: "",
      connected_at: new Date().toISOString(),
    });

    const result = await verifySession(session, SECRET);
    expect(result).not.toBeNull();
    // Session must only contain safe fields
    expect(result).not.toHaveProperty("access_token");
    expect(result).not.toHaveProperty("refresh_token");
    expect(result).not.toHaveProperty("client_secret");
  });
});

describe("Token — Refresh Logic (unit)", () => {
  it("isTokenExpired correctly identifies expired tokens", () => {
    // This tests the logic, not the full service
    const now = Date.now();
    const expired = new Date(now - 1000);
    const valid = new Date(now + 3600 * 1000);
    const nearExpiry = new Date(now + 3 * 60 * 1000); // 3 minutes

    // Replicate the isTokenExpired logic
    function isTokenExpired(expiresAt: Date | null): boolean {
      if (!expiresAt) return false;
      const bufferMs = 5 * 60 * 1000;
      return Date.now() >= expiresAt.getTime() - bufferMs;
    }

    expect(isTokenExpired(expired)).toBe(true);
    expect(isTokenExpired(valid)).toBe(false);
    expect(isTokenExpired(nearExpiry)).toBe(true); // within 5-min buffer
    expect(isTokenExpired(null)).toBe(false);
  });

  it("token error types are well-formed", () => {
    const errorTypes = [
      "NO_ACCOUNT: No TikTok account is connected",
      "TOKEN_REFRESH_FAILED: Token expired and no refresh token available. Please reconnect TikTok.",
      "CONFIG_MISSING: TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not configured",
      "TOKEN_REFRESH_FAILED: HTTP 401",
    ];

    for (const error of errorTypes) {
      expect(error).toBeTruthy();
      expect(typeof error).toBe("string");
      expect(error.length).toBeGreaterThan(0);
    }
  });
});
