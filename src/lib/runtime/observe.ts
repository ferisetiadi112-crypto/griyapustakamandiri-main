/**
 * Runtime Observation
 *
 * Performs an observation of a specific TikTok page via the browser.
 * Used by the runtime scheduler to observe different targets.
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tiktokBrowserAccount, browserObservation, aiMemory } from "@/db/schema";
import { getBrowserProvider } from "@/lib/browser";
import { buildObservationReport } from "@/lib/agent/report";
import { computeDiff } from "@/lib/agent/diff";
import type { ObservationReport } from "@/lib/agent/report";
import type { RuntimeSource, ObservationTarget } from "./types";
import { buildTargetUrl } from "./scheduler";

// ─── Target URL Map ──────────────────────────────────────

const TARGET_NAVIGATION: Record<ObservationTarget, (username: string) => string> = {
  profile: (u) => `https://www.tiktok.com/@${u}`,
  content: (u) => `https://www.tiktok.com/@${u}`,
  video_performance: (u) => `https://www.tiktok.com/@${u}`,
  analytics: () => "https://www.tiktok.com/creator/analytics/overview",
  comments: (u) => `https://www.tiktok.com/@${u}`,
  messages: () => "https://www.tiktok.com/inbox",
  notifications: () => "https://www.tiktok.com/notification",
  studio: () => "https://www.tiktok.com/tiktokstudio/upload",
  audience: () => "https://www.tiktok.com/creator/analytics/audience",
};

// ─── Observe Target ──────────────────────────────────────

/**
 * Observe a specific TikTok target via browser.
 * Navigates to the target page, extracts data, builds report, saves to DB.
 */
export async function observeTarget(
  runtimeSource: RuntimeSource,
  target: ObservationTarget,
): Promise<ObservationReport | null> {
  const db = getDatabase();
  const account = await db.query.tiktokBrowserAccount.findFirst();

  if (!account || !account.browserProfileId) {
    console.error("[Observe] No primary TikTok account configured");
    return null;
  }

  const provider = await getBrowserProvider();
  if (!provider.isAvailable) {
    console.error(`[Observe] Browser provider not available: ${provider.status}`);
    return null;
  }

  try {
    // Launch browser session (headless)
    const session = await provider.launchSession(account.browserProfileId, {
      headless: true,
    });

    if (session.status !== "active") {
      console.error(`[Observe] Browser session failed: ${session.status}`);
      return null;
    }

    // Build navigation URL
    const username = account.username ?? "unknown";
    const navigateUrl = TARGET_NAVIGATION[target]?.(username) ?? "https://www.tiktok.com";

    // Navigate to target
    await provider.navigate(session.sessionId, navigateUrl);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for page load

    // Get page content
    const content = await provider.getPageContent(session.sessionId);

    // Get previous observation for comparison
    const prevObs = await db.query.browserObservation.findFirst({
      orderBy: desc(browserObservation.observedAt),
    });

    let previousReport: ObservationReport | null = null;
    if (prevObs?.structuredData) {
      try {
        previousReport = prevObs.structuredData as unknown as ObservationReport;
      } catch {
        // Previous data not parseable
      }
    }

    // Build observation report
    const report = buildObservationReport({
      accountId: account.id,
      url: content.url,
      title: content.title,
      text: content.text,
      metadata: content.metadata,
      previousReport,
    });

    // Compute diff
    let changesDetected = null;
    if (previousReport) {
      const diff = computeDiff(previousReport, report);
      if (diff.length > 0) {
        changesDetected = diff;
      }
    }

    // Save to database
    await db.insert(browserObservation).values({
      accountId: account.id,
      page: report.page,
      category: target,
      rawSummary: report.summary,
      structuredData: report as unknown as Record<string, unknown>,
      importantFindings: null,
      changesDetected: changesDetected as unknown as Record<string, unknown>,
      confidence: report.confidence,
    });

    // Save findings to AI memory
    if (report.confidence === "high" || report.confidence === "medium") {
      await db.insert(aiMemory).values({
        kind: "fact",
        content: `[${target}] ${report.summary}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    if (changesDetected) {
      await db.insert(aiMemory).values({
        kind: "result",
        content: `[${target}] Changes: ${JSON.stringify(changesDetected)}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    // Update last observed
    await db
      .update(tiktokBrowserAccount)
      .set({ lastObservedAt: new Date(), updatedAt: new Date() })
      .where(eq(tiktokBrowserAccount.id, account.id));

    // Close session (profile persists)
    await provider.closeSession(session.sessionId);

    console.log(`[Observe] ${target} observation complete: ${report.summary}`);
    return report;
  } catch (err) {
    console.error(`[Observe] ${target} observation failed:`, err);
    return null;
  }
}
