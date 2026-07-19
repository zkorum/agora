import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { zodContentTranslationSubject } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { getInitialOpinionDisplayText } from "./opinionItemDisplayText";

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
