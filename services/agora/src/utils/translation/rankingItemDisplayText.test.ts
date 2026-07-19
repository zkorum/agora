import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { resolveRankingItemDisplayText } from "./rankingItemDisplayText";
import type { RankingItemContentTranslationPreview } from "./useContentTranslationPreview";

const translatedDisplayContent: RankingItemDisplayedContent = {
  sourceVersion: "00000000-0000-4000-8000-000000000001",
  status: "available",
  mode: "translated",
  content: {
    title: "Translated title",
    bodyHtml: "<p>Translated body</p>",
  },
  translationControl: {
    status: "completed",
    sourceLanguageLabel: "English",
    alternateMode: "original",
    canRequestAlternate: true,
  },
};

const originalDisplayContent: RankingItemDisplayedContent = {
  sourceVersion: "00000000-0000-4000-8000-000000000002",
  status: "available",
  mode: "original",
  content: {
    title: "Original title",
    bodyHtml: "<p>Original body</p>",
  },
  translationControl: {
    status: "not_requested",
    sourceLanguageLabel: "English",
    alternateMode: "translated",
    canRequestAlternate: true,
  },
};

function preview(
  values: Pick<
    RankingItemContentTranslationPreview,
    "mode" | "originalContent" | "translatedContent"
  >
): RankingItemContentTranslationPreview {
  return {
    isAvailable: true,
    isLoadingInitialTranslation: false,
    sourceLanguageLabel: "English",
    translationStatus: "completed",
    ...values,
  };
}

describe("resolveRankingItemDisplayText", () => {
  it("uses the fetched original variant when translated content was displayed initially", () => {
    const result = resolveRankingItemDisplayText({
      displayContent: translatedDisplayContent,
      translationPreview: preview({
        mode: "original",
        originalContent: {
          title: "Original title",
          bodyHtml: "<p>Original body</p>",
        },
        translatedContent: {
          title: "Translated title",
          bodyHtml: "<p>Translated body</p>",
        },
      }),
    });

    expect(result).toEqual({
      title: "Original title",
      body: "<p>Original body</p>",
    });
  });

  it("does not present translated content as original while the original loads", () => {
    const result = resolveRankingItemDisplayText({
      displayContent: translatedDisplayContent,
      translationPreview: preview({
        mode: "original",
        originalContent: undefined,
        translatedContent: {
          title: "Translated title",
          bodyHtml: "<p>Translated body</p>",
        },
      }),
    });

    expect(result).toEqual({ title: "", body: null });
  });

  it("keeps original content visible while a translation loads", () => {
    const result = resolveRankingItemDisplayText({
      displayContent: originalDisplayContent,
      translationPreview: preview({
        mode: "original",
        originalContent: undefined,
        translatedContent: undefined,
      }),
    });

    expect(result).toEqual({
      title: "Original title",
      body: "<p>Original body</p>",
    });
  });
});
