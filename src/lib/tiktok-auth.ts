/**
 * TikTok OAuth crypto utilities.
 * Uses the Web Crypto API (universal runtime support — Node, Cloudflare, Edge).
 */

function getWebCrypto(): Crypto {
  // Node 19+ and Cloudflare Workers expose globalThis.crypto
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    return globalThis.crypto;
  }
  // Fallback for older Node (tests, local dev)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto") as typeof import("crypto");
  return nodeCrypto.webcrypto as unknown as Crypto;
}

/** Generate a cryptographically secure random hex string (32 bytes = 64 hex chars). */
export function generateState(): string {
  const bytes = new Uint8Array(32);
  getWebCrypto().getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hash → hex string. */
export async function sha256(data: string): Promise<string> {
  const crypto = getWebCrypto();
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 signature → hex string. */
export async function hmacSign(
  data: string,
  secret: string,
): Promise<string> {
  const crypto = getWebCrypto();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigArray = new Uint8Array(signature);
  return Array.from(sigArray, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Encode a string to base64url. */
export function base64urlEncode(data: string): string {
  const bytes = new TextEncoder().encode(data);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url string to UTF-8. */
export function base64urlDecode(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
