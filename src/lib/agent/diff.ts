/**
 * Observation Diff
 *
 * Compares two observation reports and identifies changes.
 * All changes are derived from OBSERVED data — never fabricated.
 */

import type { ObservationReport, ClassifiedField } from "./report";

export type Change = {
  field: string;
  category: "account" | "content" | "analytics";
  previousValue: string | number | null;
  currentValue: string | number | null;
  description: string;
};

/**
 * Compare two observation reports and return detected changes.
 */
export function computeDiff(
  previous: ObservationReport,
  current: ObservationReport,
): Change[] {
  const changes: Change[] = [];

  // Compare account fields
  compareCategory(previous.account, current.account, "account", changes);

  // Compare content fields
  compareCategory(previous.content, current.content, "content", changes);

  // Compare analytics fields
  compareCategory(previous.analytics, current.analytics, "analytics", changes);

  return changes;
}

function compareCategory(
  previous: Record<string, ClassifiedField>,
  current: Record<string, ClassifiedField>,
  category: "account" | "content" | "analytics",
  changes: Change[],
): void {
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    const prev = previous[key];
    const curr = current[key];

    // Skip change-tracking fields themselves
    if (key.endsWith("Change")) continue;

    const prevValue = prev?.value ?? null;
    const currValue = curr?.value ?? null;

    // Only compare if both are OBSERVED
    if (
      prev?.classification === "OBSERVED" &&
      curr?.classification === "OBSERVED" &&
      prevValue !== currValue
    ) {
      changes.push({
        field: key,
        category,
        previousValue: prevValue,
        currentValue: currValue,
        description: `${key}: ${prevValue} → ${currValue}`,
      });
    }

    // If field was unknown and now observed
    if (
      prev?.classification === "UNKNOWN" &&
      curr?.classification === "OBSERVED" &&
      currValue != null
    ) {
      changes.push({
        field: key,
        category,
        previousValue: null,
        currentValue: currValue,
        description: `${key}: now available (${currValue})`,
      });
    }

    // If field was observed and now unknown
    if (
      prev?.classification === "OBSERVED" &&
      curr?.classification === "UNKNOWN" &&
      prevValue != null
    ) {
      changes.push({
        field: key,
        category,
        previousValue: prevValue,
        currentValue: null,
        description: `${key}: no longer visible`,
      });
    }
  }
}
