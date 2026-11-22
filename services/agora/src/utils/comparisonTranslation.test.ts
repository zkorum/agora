import type { PrioritizationItem } from "src/shared/types/dto";
import type { LocalizedContentTranslationStatus } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { hasPendingComparisonItemTranslations } from "./comparisonTranslation";

function itemWithTranslationStatus(
  status: LocalizedContentTranslationStatus
): PrioritizationItem {
  return {
    slugId: "item",
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { title: "Title" },
      translationControl: {
        status,
        alternateMode: "translated",
        canRequestAlternate: true,
      },
    },
    lifecycleStatus: "active",
    externalUrl: null,
    snapshotScore: null,
    snapshotRank: null,
    snapshotParticipantCount: null,
    createdAt: "2026-07-30T00:00:00.000Z",
  };
}

describe("hasPendingComparisonItemTranslations", () => {
  it.each(["pending", "running"] as const)(
    "returns true for %s translation work",
    (status) => {
      expect(
        hasPendingComparisonItemTranslations([
          itemWithTranslationStatus("completed"),
          itemWithTranslationStatus(status),
        ])
      ).toBe(true);
    }
  );

  it.each(["completed", "failed", "not_requested"] as const)(
    "returns false for terminal %s translation work",
    (status) => {
      expect(
        hasPendingComparisonItemTranslations([
          itemWithTranslationStatus(status),
        ])
      ).toBe(false);
    }
  );

  it("returns false without item data", () => {
    expect(hasPendingComparisonItemTranslations(undefined)).toBe(false);
  });
});
