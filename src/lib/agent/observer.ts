/**
 * Agent Observer
 *
 * Main observation orchestrator for the primary TikTok account.
 * Connects to the persistent browser, reads TikTok page content,
 * builds a structured report, and saves to database.
 *
 * No TikTok API is used — all data comes from the browser page.
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { tiktokBrowserAccount, browserObservation, aiMemory } from "@/db/schema";
import { getBrowserProvider } from "@/lib/browser";
import { buildObservationReport } from "./report";
import { computeDiff } from "./diff";
import type { ObservationReport } from "./report";

/**
 * Observe the primary TikTok account via browser.
 *
 * Flow:
 * 1. Load primary account from DB
 * 2. Connect to persistent browser profile
 * 3. Navigate to TikTok (or use current page)
 * 4. Extract visible data
 * 5. Build observation report
 * 6. Compare with previous observation
 * 7. Save to database
 * 8. Return report
 */
export async function observePrimaryAccount(): Promise<ObservationReport | null> {
  const db = getDatabase();
  const account = await db.query.tiktokBrowserAccount.findFirst();

  if (!account || !account.browserProfileId) {
    console.error("[Observer] No primary TikTok account configured");
    return null;
  }

  if (account.status !== "connected") {
    console.error(`[Observer] Account status is "${account.status}" — cannot observe`);
    return null;
  }

  const provider = await getBrowserProvider();
  if (!provider.isAvailable) {
    console.error(`[Observer] Browser provider not available: ${provider.status}`);
    return null;
  }

  try {
    // 1. Launch browser session (headless for agent)
    const session = await provider.launchSession(account.browserProfileId, {
      headless: true,
    });

    if (session.status !== "active") {
      console.error(`[Observer] Browser session failed: ${session.status}`);
      return null;
    }

    // 2. Navigate to TikTok profile if on a different page
    const content = await provider.getPageContent(session.sessionId);
    const currentUrl = content.url;

    if (!currentUrl.includes("tiktok.com")) {
      await provider.navigate(session.sessionId, "https://www.tiktok.com");
      // Wait a moment for page load
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 3. Get page content
    const pageContent = await provider.getPageContent(session.sessionId);

    // 4. Get previous observation for comparison
    const prevObs = await db.query.browserObservation.findFirst({
      orderBy: desc(browserObservation.observedAt),
    });

    let previousReport: ObservationReport | null = null;
    if (prevObs?.structuredData) {
      try {
        previousReport = prevObs.structuredData as unknown as ObservationReport;
      } catch {
        // ignore — previous data not parseable
      }
    }

    // 5. Build observation report
    const report = buildObservationReport({
      accountId: account.id,
      url: pageContent.url,
      title: pageContent.title,
      text: pageContent.text,
      metadata: pageContent.metadata,
      previousReport,
    });

    // 6. Compute diff with previous observation
    let changesDetected = null;
    if (previousReport) {
      const diff = computeDiff(previousReport, report);
      if (diff.length > 0) {
        changesDetected = diff;
      }
    }

    // 7. Save observation to database
    await db.insert(browserObservation).values({
      accountId: account.id,
      page: report.page,
      category: "account",
      rawSummary: report.summary,
      structuredData: report as unknown as Record<string, unknown>,
      importantFindings: null,
      changesDetected: changesDetected as unknown as Record<string, unknown>,
      confidence: report.confidence,
    });

    // 8. Save significant findings to ai_memory
    if (report.confidence === "high" || report.confidence === "medium") {
      await db.insert(aiMemory).values({
        kind: "fact",
        content: `Observation: ${report.summary}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    if (changesDetected) {
      await db.insert(aiMemory).values({
        kind: "result",
        content: `Changes detected: ${JSON.stringify(changesDetected)}`,
        source: "browser_observation",
        accountId: account.id,
      });
    }

    // 9. Update account last_observed_at
    await db
      .update(tiktokBrowserAccount)
      .set({ lastObservedAt: new Date(), updatedAt: new Date() })
      .where(eq(tiktokBrowserAccount.id, account.id));

    // 10. Close session (profile persists)
    await provider.closeSession(session.sessionId);

    console.log(`[Observer] Observation complete: ${report.summary}`);
    return report;
  } catch (err) {
    console.error("[Observer] Observation failed:", err);
    return null;
  }
}
