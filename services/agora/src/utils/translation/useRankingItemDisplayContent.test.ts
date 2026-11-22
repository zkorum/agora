import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, toValue } from "vue";

import type { useRankingItemContentTranslationPreview } from "./useContentTranslationPreview";

const previews = vi.hoisted(() => ({
  usePreview:
    vi.fn<
      (
        input: Parameters<typeof useRankingItemContentTranslationPreview>[0]
      ) => void
    >(),
}));
vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    displayLanguage: ref("en"),
    spokenLanguages: ref(["en"]),
  }),
}));
vi.mock("./useContentTranslationPreview", () => ({
  useRankingItemContentTranslationPreview: (
    input: Parameters<typeof useRankingItemContentTranslationPreview>[0]
  ) => {
    previews.usePreview(input);
    return { preview: ref(undefined), setMode: vi.fn() };
  },
}));

import { useRankingItemDisplayContent } from "./useRankingItemDisplayContent";

const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  vi.clearAllMocks();
});
describe("batched versus row-level pending translation refresh", () => {
  it.each([true, false])(
    "follows server pending translations only when requested (%s)",
    (followPendingServerTranslation) => {
      const displayContent: RankingItemDisplayedContent = {
        sourceVersion: "00000000-0000-4000-8000-000000000001",
        status: "available",
        mode: "original",
        content: { title: "Proposal" },
        translationControl: {
          status: "pending",
          sourceLanguageLabel: "English",
          alternateMode: "translated",
          canRequestAlternate: true,
        },
      };
      const scope = effectScope();
      scopes.push(scope);
      scope.run(() =>
        useRankingItemDisplayContent({
          conversationSlugId: "qvtest01",
          itemSlugId: "proposal",
          displayContent,
          followPendingServerTranslation,
        })
      );
      const input = previews.usePreview.mock.calls[0]?.[0];
      if (input === undefined)
        throw new Error("Translation preview not initialized");
      expect(toValue(input.enabled)).toBe(followPendingServerTranslation);
    }
  );
});
