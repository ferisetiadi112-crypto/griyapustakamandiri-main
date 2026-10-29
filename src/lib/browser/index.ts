/**
 * Browser Provider Factory
 *
 * Returns the configured BrowserProvider based on environment variables.
 * Defaults to LocalBrowserProvider (Playwright).
 *
 * IMPORTANT: Provider implementations are lazy-loaded to prevent
 * server-side modules (Playwright) from being bundled into client builds.
 *
 * Environment:
 *   BROWSER_PROVIDER = "local" | "browserless" | "cloud"
 *   Defaults to "local" if not set.
 *
 * Cloud provider:
 *   BROWSERLESS_API_KEY=...
 *
 * "cloud" is an alias for "browserless".
 */

import type { BrowserProvider } from "./types";
import { hasServerEnv, isServerlessRuntime, readServerEnv } from "./server-env";

let cachedProvider: BrowserProvider | null = null;

/**
 * Resolve which provider should be used.
 * - explicit BROWSER_PROVIDER wins
 * - otherwise: browserless whenever an API key exists or we're serverless
 */
export function resolveProviderType(): "local" | "browserless" {
  const explicit = readServerEnv("BROWSER_PROVIDER")?.trim().toLowerCase();

  if (explicit === "browserless" || explicit === "cloud") return "browserless";
  if (explicit === "local") return "local";

  if (hasServerEnv("BROWSERLESS_API_KEY") || isServerlessRuntime()) {
    return "browserless";
  }
  return "local";
}

/**
 * Get the configured browser provider.
 * Caches only usable providers so a transient misconfiguration is retried.
 * Lazy-loads provider implementations to avoid client bundle pollution.
 */
export async function getBrowserProvider(): Promise<BrowserProvider> {
  if (cachedProvider) return cachedProvider;

  const providerType = resolveProviderType();

  if (providerType === "browserless") {
    // Lazy-load cloud provider
    const { CloudBrowserProvider } = await import("./cloud-provider");
    const provider = new CloudBrowserProvider();

    if (provider.isAvailable) {
      console.log(`[Browser] Using cloud provider: ${provider.name}`);
      cachedProvider = provider;
      return cachedProvider;
    }

    console.warn(
      "[Browser] Cloud provider not configured (missing BROWSERLESS_API_KEY).",
    );

    // In serverless there is no working local fallback — return the cloud
    // provider so the caller surfaces the real (configuration) reason.
    if (isServerlessRuntime()) {
      return provider;
    }

    console.warn("[Browser] Falling back to local provider.");
  }

  // Default: local Playwright provider
  // Lazy-load to prevent client bundle from including Playwright
  const { LocalBrowserProvider } = await import("./local-provider");
  const local = new LocalBrowserProvider();

  console.log(`[Browser] Using provider: ${local.name}`);
  if (local.isAvailable) cachedProvider = local;
  return local;
}

/**
 * Safe diagnostic snapshot — never includes secret values.
 */
export function getBrowserProviderDiagnostics() {
  return {
    resolvedProvider: resolveProviderType(),
    browserProviderEnvSet: hasServerEnv("BROWSER_PROVIDER"),
    browserlessApiKeyPresent: hasServerEnv("BROWSERLESS_API_KEY"),
    serverless: isServerlessRuntime(),
  };
}

/**
 * Reset the cached provider (for testing or runtime source changes).
 */
export function resetBrowserProvider(): void {
  cachedProvider = null;
}

export type {
  BrowserProvider,
  BrowserProfile,
  BrowserSession,
  PageContent,
  PageMetadata,
  ScreenshotResult,
  LaunchOptions,
  SessionStatus,
} from "./types";
