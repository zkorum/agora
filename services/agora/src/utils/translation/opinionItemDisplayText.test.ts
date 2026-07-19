import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { zodContentTranslationSubject } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  getInitialOpinionDisplayText,
  getPendingOpinionTranslationMode,
} from "./opinionItemDisplayText";

const sourceVersion = "00000000-0000-4000-8000-000000000001";

function opinionItem(
  displayContent: DisplayedOpinionItem["displayContent"]
): DisplayedOpinionItem {
  return {
    opinionSlugId: "opinion-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    opinion: "Original statement",
    sourceLanguageCode: "en",
    numParticipants: 1,
    numAgrees: 1,
    numDisagrees: 0,
    numPasses: 0,
    username: "alice",
    moderation: { status: "unmoderated" },
    isSeed: false,
    displayContent,
  };
}

describe("getInitialOpinionDisplayText", () => {
  it("returns the server-selected translation", () => {
    const item = opinionItem({
      sourceVersion,
      status: "available",
      mode: "translated",
      content: { content: "Translated statement" },
      translationControl: {
        status: "completed",
        alternateMode: "original",
        canRequestAlternate: true,
      },
    });

    expect(getInitialOpinionDisplayText(item)).toBe("Translated statement");
  });

  it("keeps the original while a translation is unavailable", () => {
    const item = opinionItem({
      sourceVersion,
      status: "pending",
      translationControl: {
        status: "pending",
        alternateMode: "translated",
        canRequestAlternate: true,
      },
    });

    expect(getInitialOpinionDisplayText(item)).toBe("Original statement");
  });
});

describe("getPendingOpinionTranslationMode", () => {
  it.each(["pending", "running"] as const)(
    "follows the server alternate mode while translation is %s",
    (status) => {
      const item = opinionItem({
        sourceVersion,
        status,
        translationControl: {
          status,
          alternateMode: "translated",
          canRequestAlternate: true,
        },
      });

      expect(getPendingOpinionTranslationMode(item)).toBe("translated");
    }
  );

  it("does not follow a completed translation in the background", () => {
    const item = opinionItem({
      sourceVersion,
      status: "available",
      mode: "original",
      content: { content: "Original statement" },
      translationControl: {
        status: "completed",
        alternateMode: "translated",
        canRequestAlternate: true,
      },
    });

    expect(getPendingOpinionTranslationMode(item)).toBeUndefined();
  });
});

describe("opinion translation subject", () => {
  it("requires the exact source revision", () => {
    expect(
      zodContentTranslationSubject.safeParse({
        kind: "opinion",
        conversationSlugId: "conv1234",
        opinionSlugId: "opin1234",
      }).success
    ).toBe(false);
    expect(
      zodContentTranslationSubject.safeParse({
        kind: "opinion",
        conversationSlugId: "conv1234",
        opinionSlugId: "opin1234",
        sourceVersion,
      }).success
    ).toBe(true);
  });
});
