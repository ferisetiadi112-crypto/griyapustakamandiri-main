/**
 * Observation Report Builder
 *
 * Structures raw browser observation data into a typed report
 * with OBSERVED / INFERRED / UNKNOWN classifications.
 */

// ─── Types ──────────────────────────────────────────────────

export type ClassifiedField = {
  value: string | number | null;
  classification: "OBSERVED" | "INFERRED" | "UNKNOWN";
  evidence?: string;
};

export type ObservationReport = {
  accountId: number;
  observedAt: string;
  page: string;
  account: AccountFields;
  content: ContentFields;
  analytics: AnalyticsFields;
  summary: string;
  unknown: string[];
  confidence: "high" | "medium" | "low";
};

export type AccountFields = {
  username: ClassifiedField;
  displayName: ClassifiedField;
  profileUrl?: ClassifiedField;
  followers: ClassifiedField;
  followersChange?: ClassifiedField;
  following: ClassifiedField;
  likes: ClassifiedField;
};

export type ContentFields = {
  visibleMetrics: ClassifiedField;
};

export type AnalyticsFields = {
  analyticsAvailable: ClassifiedField;
};

// ─── Builder ────────────────────────────────────────────────

/**
 * Build an observation report from page content and metadata.
 * All data is extracted from the actual browser page — nothing is fabricated.
 */
export function buildObservationReport(params: {
  accountId: number;
  url: string;
  title: string;
  text: string;
  metadata: {
    isLoggedIn: boolean;
    detectedUsername: string | null;
    detectedDisplayName: string | null;
    detectedProfileUrl: string | null;
  };
  previousReport?: ObservationReport | null;
}): ObservationReport {
  const { accountId, url, text, metadata, previousReport } = params;
  const now = new Date().toISOString();

  const unknown: string[] = [];

  // ─── Account Profile ──────────────────────────────

  const account: AccountFields = {
    username: metadata.detectedUsername
      ? {
          value: metadata.detectedUsername,
          classification: "OBSERVED",
          evidence: "Detected from TikTok page URL",
        }
      : (() => {
          unknown.push("Username: not visible on current page");
          return { value: null, classification: "UNKNOWN", evidence: "Username not visible on current page" };
        })(),

    displayName: metadata.detectedDisplayName
      ? {
          value: metadata.detectedDisplayName,
          classification: "OBSERVED",
          evidence: "Detected from TikTok page content",
        }
      : (() => {
          unknown.push("Display name: not visible on current page");
          return { value: null, classification: "UNKNOWN", evidence: "Display name not visible on current page" };
        })(),

    followers: { value: null, classification: "UNKNOWN", evidence: "Not visible on current page" },
    following: { value: null, classification: "UNKNOWN", evidence: "Not visible on current page" },
    likes: { value: null, classification: "UNKNOWN", evidence: "Not visible on current page" },
  };

  if (metadata.detectedProfileUrl) {
    account.profileUrl = {
      value: metadata.detectedProfileUrl,
      classification: "OBSERVED",
      evidence: "Constructed from detected username",
    };
  }

  // Try to extract follower/following/likes from visible text
  const followerMatch = text.match(/(\d[\d,]*)\s*Followers/i);
  const followingMatch = text.match(/(\d[\d,]*)\s*Following/i);
  const likesMatch = text.match(/(\d[\d,]*)\s*Likes/i);

  if (followerMatch) {
    const value = parseInt(followerMatch[1]!.replace(/,/g, ""), 10);
    account.followers = {
      value,
      classification: "OBSERVED",
      evidence: "Visible on profile page",
    };

    if (previousReport?.account.followers?.value != null && typeof previousReport.account.followers.value === "number") {
      const diff = value - previousReport.account.followers.value;
      if (diff !== 0) {
        account.followersChange = {
          value: diff > 0 ? `+${diff}` : String(diff),
          classification: "INFERRED",
          evidence: `Compared with previous observation (${previousReport.account.followers.value})`,
        };
      }
    }
  } else {
    unknown.push("Followers: not visible on current page");
  }

  if (followingMatch) {
    account.following = {
      value: parseInt(followingMatch[1]!.replace(/,/g, ""), 10),
      classification: "OBSERVED",
      evidence: "Visible on profile page",
    };
  } else {
    unknown.push("Following: not visible on current page");
  }

  if (likesMatch) {
    account.likes = {
      value: parseInt(likesMatch[1]!.replace(/,/g, ""), 10),
      classification: "OBSERVED",
      evidence: "Visible on profile page",
    };
  } else {
    unknown.push("Total likes: not visible on current page");
  }

  // ─── Content ──────────────────────────────────────

  const videoMatches = text.match(/(\d[\d,.]*[KkMm]?)\s*(views?|plays?|likes?|comments?|shares?)/gi);
  const content: ContentFields = {
    visibleMetrics: videoMatches && videoMatches.length > 0
      ? {
          value: videoMatches.slice(0, 5).join(", "),
          classification: "OBSERVED",
          evidence: "Visible on page",
        }
      : (() => {
          unknown.push("Video metrics: not visible on current page");
          return { value: null, classification: "UNKNOWN", evidence: "No video metrics visible on current page" };
        })(),
  };

  // ─── Analytics ────────────────────────────────────

  const analytics: AnalyticsFields = {
    analyticsAvailable: {
      value: url.includes("/analytics") || url.includes("/studio") ? "Yes" : "Not on analytics page",
      classification: "OBSERVED",
      evidence: `Current URL: ${url}`,
    },
  };

  if (!url.includes("/analytics") && !url.includes("/studio")) {
    unknown.push("Analytics: not accessible from current page");
  }

  // ─── Summary ──────────────────────────────────────

  const allFields: ClassifiedField[] = [
    account.username,
    account.displayName,
    account.followers,
    account.following,
    account.likes,
    content.visibleMetrics,
    analytics.analyticsAvailable,
  ];

  const observedCount = allFields.filter((f) => f.classification === "OBSERVED").length;
  const unknownCount = unknown.length;

  let confidence: "high" | "medium" | "low" = "low";
  if (observedCount >= 5) confidence = "high";
  else if (observedCount >= 2) confidence = "medium";

  const summary = `Observed ${observedCount} data points. ${unknownCount} items unknown. Page: ${params.title || url}.`;

  return {
    accountId,
    observedAt: now,
    page: url,
    account,
    content,
    analytics,
    summary,
    unknown,
    confidence,
  };
}
