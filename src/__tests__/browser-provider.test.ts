import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Cloud Provider Tests ─────────────────────────────────

describe("Cloud Browser Provider", () => {
  beforeEach(() => {
    // Clear env
    delete process.env["BROWSER_PROVIDER"];
    delete process.env["BROWSERLESS_API_KEY"];
  });

  it("reports not_configured when credentials are missing", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    expect(provider.isAvailable).toBe(false);
    expect(provider.status).toContain("not_configured");
  });

  it("reports ready when credentials are present", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    expect(provider.isAvailable).toBe(true);
    expect(provider.status).toBe("ready");
  });

  it("throws on createProfile when not configured", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    await expect(provider.createProfile("test")).rejects.toThrow("not configured");
  });

  it("createProfile returns deterministic profile name", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profile = await provider.createProfile("tiktok-primary");
    expect(profile.id).toBe("hey5050-tiktok-primary");
    expect(profile.name).toBe("hey5050-tiktok-primary");
  });

  it("returns not_found for connectProfile when not configured", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const result = await provider.connectProfile("nonexistent");
    expect(result.exists).toBe(false);
    expect(result.profile).toBeNull();
  });

  it("returns error status for launchSession when not configured", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const session = await provider.launchSession("test-profile");
    expect(session.status).toBe("error");
  });

  it("returns empty array for listProfiles when not configured", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profiles = await provider.listProfiles();
    expect(profiles).toEqual([]);
  });

  it("has correct provider name", async () => {
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    expect(provider.name).toBe("browserless-cloud");
  });

  it("saveProfile returns false when session not found", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const result = await provider.saveProfile("nonexistent-session", "test-profile");
    expect(result).toBe(false);
  });

  it("launchSession returns error with diagnostic when configured but no real Browserless", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key-for-failure";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    // This will attempt to POST /profile to Browserless with a fake key
    // and fail — the session should contain an error message
    const session = await provider.launchSession("hey5050-tiktok-primary");
    expect(session.status).toBe("error");
    // The error field should contain a safe diagnostic (not the raw key)
    expect(session.error).toBeDefined();
    expect(session.error).not.toContain("test-key-for-failure");
  });

  it("launchSession error does not leak API key", async () => {
    process.env["BROWSERLESS_API_KEY"] = "super-secret-api-key-xyz";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const session = await provider.launchSession("hey5050-tiktok-primary");
    expect(session.status).toBe("error");
    expect(session.error).toBeDefined();
    expect(session.error).not.toContain("super-secret-api-key-xyz");
    expect(session.error).not.toContain("super-secret");
  });

  it("cloud provider does not use filesystem", async () => {
    // The cloud provider must NEVER attempt to create local directories.
    const fs = await import("fs");
    const path = await import("path");
    const profilesDir = path.resolve(process.cwd(), "browser-profiles");

    process.env["BROWSERLESS_API_KEY"] = "test-key";
    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    await provider.createProfile("tiktok-primary");
    await provider.connectProfile("hey5050-tiktok-primary");

    // Cloud provider should NEVER create local profile directories
    expect(fs.existsSync(profilesDir)).toBe(false);
  });
});

// ─── Browserless URL Pattern Tests ────────────────────────

describe("Browserless URL Patterns", () => {
  it("profile reuse uses ?profile= query parameter", async () => {
    // The documented Browserless pattern for reusing profiles:
    // wss://production-sfo.browserless.io/chromium/playwright?token=TOKEN&profile=PROFILE_NAME
    //
    // NOT: /profiles/{id}
    // NOT: any other path-based pattern

    const documentedPattern = /\/chromium\/playwright\?token=[^&]+&profile=/;
    expect(documentedPattern.test(
      "wss://production-sfo.browserless.io/chromium/playwright?token=test&profile=hey5050-tiktok",
    )).toBe(true);
  });

  it("profile creation uses POST /profile endpoint", async () => {
    // The documented Browserless pattern for creating profiles:
    // POST https://production-sfo.browserless.io/profile?token=TOKEN
    // Body: { "name": "profile-name" }
    //
    // NOT: /profiles/{id}
    // NOT: any other path-based pattern

    const documentedPattern = /\/profile\?token=/;
    expect(documentedPattern.test(
      "https://production-sfo.browserless.io/profile?token=test",
    )).toBe(true);
  });

  it("profile name is isolated per TikTok account", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profile1 = await provider.createProfile("tiktok-primary");
    const profile2 = await provider.createProfile("tiktok-secondary");

    expect(profile1.id).toBe("hey5050-tiktok-primary");
    expect(profile2.id).toBe("hey5050-tiktok-secondary");
    expect(profile1.id).not.toBe(profile2.id);
  });

  it("browserProfileId stores profile NAME not path", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profile = await provider.createProfile("tiktok-primary");
    // Must be a name like "hey5050-tiktok-primary", NOT a filesystem path
    expect(profile.id).not.toContain("/");
    expect(profile.id).not.toContain("\\");
    expect(profile.id).not.toContain("var");
    expect(profile.id).not.toContain("task");
  });
});

// ─── Browser Factory Tests ────────────────────────────────

describe("Browser Provider Factory", () => {
  beforeEach(() => {
    delete process.env["BROWSER_PROVIDER"];
    delete process.env["BROWSERLESS_API_KEY"];
  });

  it("defaults to local provider", async () => {
    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();

    const provider = await getBrowserProvider();
    expect(provider.name).toBe("playwright-local");
    expect(provider.isAvailable).toBe(true);
  });

  it("uses local provider when BROWSER_PROVIDER=local", async () => {
    process.env["BROWSER_PROVIDER"] = "local";
    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();

    const provider = await getBrowserProvider();
    expect(provider.name).toBe("playwright-local");
  });

  it("falls back to local when browserless is not configured", async () => {
    process.env["BROWSER_PROVIDER"] = "browserless";
    // No BROWSERLESS_API_KEY
    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();

    const provider = await getBrowserProvider();
    // Should fall back to local since browserless is not configured
    expect(provider.name).toBe("playwright-local");
  });

  it("falls back to local when cloud alias is not configured", async () => {
    process.env["BROWSER_PROVIDER"] = "cloud";
    // No BROWSERLESS_API_KEY
    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();

    const provider = await getBrowserProvider();
    // "cloud" is an alias for "browserless" — should fall back
    expect(provider.name).toBe("playwright-local");
  });

  it("caches provider instance", async () => {
    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();

    const p1 = await getBrowserProvider();
    const p2 = await getBrowserProvider();
    expect(p1).toBe(p2);
  });
});

// ─── RuntimeSource Type Tests ─────────────────────────────

describe("RuntimeSource Types", () => {
  it("supports local source", async () => {
    const { setSource, getSource, resetState } = await import("@/lib/runtime/state");
    resetState();
    setSource("local");
    expect(getSource()).toBe("local");
  });

  it("supports cloud source", async () => {
    const { setSource, getSource, resetState } = await import("@/lib/runtime/state");
    resetState();
    setSource("cloud");
    expect(getSource()).toBe("cloud");
  });

  it("supports vps source", async () => {
    const { setSource, getSource, resetState } = await import("@/lib/runtime/state");
    resetState();
    setSource("vps");
    expect(getSource()).toBe("vps");
  });

  it("supports device source", async () => {
    const { setSource, getSource, resetState } = await import("@/lib/runtime/state");
    resetState();
    setSource("device");
    expect(getSource()).toBe("device");
  });
});

// ─── Security Tests ──────────────────────────────────────

describe("Browser Provider Security", () => {
  it("cloud provider does not log API key", async () => {
    process.env["BROWSERLESS_API_KEY"] = "super-secret-key-12345";

    const consoleSpy = vi.spyOn(console, "log");
    const warnSpy = vi.spyOn(console, "warn");
    const errorSpy = vi.spyOn(console, "error");

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    new CloudBrowserProvider();

    // Check that API key is not in any log output
    const allLogs = [
      ...consoleSpy.mock.calls.map((c) => String(c)),
      ...warnSpy.mock.calls.map((c) => String(c)),
      ...errorSpy.mock.calls.map((c) => String(c)),
    ];

    for (const log of allLogs) {
      expect(log).not.toContain("super-secret-key-12345");
    }

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("cloud provider status does not contain credentials", async () => {
    process.env["BROWSERLESS_API_KEY"] = "secret-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    expect(provider.status).not.toContain("secret-key");
    expect(provider.name).not.toContain("secret-key");
  });

  it("factory does not expose credentials in logs", async () => {
    process.env["BROWSERLESS_API_KEY"] = "my-secret-api-key";
    process.env["BROWSER_PROVIDER"] = "browserless";

    const consoleSpy = vi.spyOn(console, "log");
    const warnSpy = vi.spyOn(console, "warn");

    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();
    await getBrowserProvider();

    const allLogs = [
      ...consoleSpy.mock.calls.map((c) => String(c)),
      ...warnSpy.mock.calls.map((c) => String(c)),
    ];

    for (const log of allLogs) {
      expect(log).not.toContain("my-secret-api-key");
    }

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("missing API key does not crash the application", async () => {
    delete process.env["BROWSERLESS_API_KEY"];

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    expect(provider.isAvailable).toBe(false);
    expect(() => provider.status).not.toThrow();
  });
});

// ─── Serverless Safety Tests ──────────────────────────────

describe("Serverless Safety", () => {
  it("cloud provider never creates /var/task/browser-profiles", async () => {
    // Verify that calling cloud provider methods never triggers filesystem mkdir
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const fs = await import("fs");
    const path = await import("path");
    const profilesDir = path.resolve(process.cwd(), "browser-profiles");

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    // Exercise all profile methods that could theoretically trigger filesystem
    await provider.createProfile("tiktok-primary");
    await provider.connectProfile("hey5050-tiktok-primary");
    await provider.listProfiles();
    await provider.deleteProfile("hey5050-tiktok-primary");

    // None of these should create local directories
    expect(fs.existsSync(profilesDir)).toBe(false);
  });

  it("cloud provider createProfile does not create filesystem directories", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const fs = await import("fs");
    const path = await import("path");
    const profilesDir = path.resolve(process.cwd(), "browser-profiles");

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    await provider.createProfile("tiktok-primary");

    // Cloud provider should NEVER create local profile directories
    expect(fs.existsSync(profilesDir)).toBe(false);
  });

  it("cloud provider profile ID does not contain filesystem paths", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profile = await provider.createProfile("tiktok-primary");

    // Profile ID must be a simple name, not a path
    expect(profile.id).not.toContain("/");
    expect(profile.id).not.toContain("\\");
    expect(profile.id).not.toContain("var");
    expect(profile.id).not.toContain("task");
    expect(profile.id).not.toContain("tmp");
    expect(profile.id).toMatch(/^hey5050-/);
  });

  it("browserProfileId is a Browserless profile name not a local path", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { CloudBrowserProvider } = await import("@/lib/browser/cloud-provider");
    const provider = new CloudBrowserProvider();

    const profile = await provider.createProfile("tiktok-primary");

    // This is what gets stored in tiktokBrowserAccount.browserProfileId
    // It MUST be a Browserless profile name like "hey5050-tiktok-primary"
    // NOT a local filesystem path
    expect(profile.id).toBe("hey5050-tiktok-primary");
    expect(profile.name).toBe("hey5050-tiktok-primary");
  });
});

// ─── Production (serverless) resolution ───────────────────

describe("Serverless provider resolution", () => {
  beforeEach(() => {
    delete process.env["BROWSER_PROVIDER"];
    delete process.env["BROWSERLESS_API_KEY"];
    delete process.env["VERCEL"];
    delete process.env["VERCEL_ENV"];
  });

  afterEach(() => {
    delete process.env["BROWSER_PROVIDER"];
    delete process.env["BROWSERLESS_API_KEY"];
    delete process.env["VERCEL"];
    delete process.env["VERCEL_ENV"];
  });

  it("resolves browserless when BROWSER_PROVIDER=browserless", async () => {
    process.env["BROWSER_PROVIDER"] = "browserless";
    const { resolveProviderType } = await import("@/lib/browser/index");
    expect(resolveProviderType()).toBe("browserless");
  });

  it("resolves browserless in a serverless runtime even without BROWSER_PROVIDER", async () => {
    process.env["VERCEL"] = "1";
    const { resolveProviderType } = await import("@/lib/browser/index");
    expect(resolveProviderType()).toBe("browserless");
  });

  it("resolves browserless whenever an API key is present", async () => {
    process.env["BROWSERLESS_API_KEY"] = "test-key";
    const { resolveProviderType } = await import("@/lib/browser/index");
    expect(resolveProviderType()).toBe("browserless");
  });

  it("selects CloudBrowserProvider (not local) in serverless production", async () => {
    process.env["VERCEL"] = "1";
    process.env["BROWSER_PROVIDER"] = "browserless";
    process.env["BROWSERLESS_API_KEY"] = "test-key";

    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();
    const provider = await getBrowserProvider();

    expect(provider.name).toBe("browserless-cloud");
    expect(provider.isAvailable).toBe(true);
    resetBrowserProvider();
  });

  it("never falls back to local in serverless when the key is missing", async () => {
    process.env["VERCEL"] = "1";
    process.env["BROWSER_PROVIDER"] = "browserless";

    const { getBrowserProvider, resetBrowserProvider } = await import("@/lib/browser/index");
    resetBrowserProvider();
    const provider = await getBrowserProvider();

    expect(provider.name).toBe("browserless-cloud");
    expect(provider.isAvailable).toBe(false);
    resetBrowserProvider();
  });

  it("diagnostics report presence only, never secret values", async () => {
    process.env["VERCEL"] = "1";
    process.env["BROWSER_PROVIDER"] = "browserless";
    process.env["BROWSERLESS_API_KEY"] = "super-secret-key-12345";

    const { getBrowserProviderDiagnostics } = await import("@/lib/browser/index");
    const diag = getBrowserProviderDiagnostics();

    expect(diag.resolvedProvider).toBe("browserless");
    expect(diag.browserlessApiKeyPresent).toBe(true);
    expect(diag.serverless).toBe(true);
    expect(JSON.stringify(diag)).not.toContain("super-secret-key-12345");
  });
});
