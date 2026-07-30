import type {
  ProjectContentVariant,
  ProjectDisplayedContent,
} from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import {
  resolveProjectContentVariant,
  resolveProjectTranslationPreview,
} from "./projectDisplayContent";
import type { ProjectContentTranslationPreview } from "./useContentTranslationPreview";

const sourceVersion = "00000000-0000-4000-8000-000000000001";
const originalContent = {
  title: "Titulo original",
  subtitle: "Subtitulo original",
} satisfies ProjectContentVariant;
const translatedContent = {
  title: "Translated title",
  subtitle: "Translated subtitle",
} satisfies ProjectContentVariant;
const initialDisplayContent = {
  sourceVersion,
  status: "available",
  mode: "translated",
  content: translatedContent,
  translationControl: {
    status: "completed",
    sourceLanguageLabel: "espanol",
    alternateMode: "original",
    canRequestAlternate: true,
  },
} satisfies ProjectDisplayedContent;

function preview(
  mode: "original" | "translated"
): ProjectContentTranslationPreview {
  return {
    mode,
    sourceLanguageLabel: "Spanish",
    translationStatus: "completed",
    originalContent,
    translatedContent,
  };
}

describe("resolveProjectContentVariant", () => {
  it("can switch from translated to original and back", () => {
    const original = resolveProjectContentVariant({
      displayContent: initialDisplayContent,
      translationPreview: preview("original"),
    });
    const translated = resolveProjectContentVariant({
      displayContent: initialDisplayContent,
      translationPreview: preview("translated"),
    });

    expect(original).toEqual(originalContent);
    expect(translated).toEqual(translatedContent);
  });
});

describe("resolveProjectTranslationPreview", () => {
  it("keeps the displayed translation until original content is available", () => {
    const initialPreview = preview("translated");
    const pendingOriginalPreview = {
      ...preview("original"),
      originalContent: undefined,
      translationStatus: "pending",
    } satisfies ProjectContentTranslationPreview;

    expect(
      resolveProjectTranslationPreview({
        requestedPreview: pendingOriginalPreview,
        initialPreview,
      })
    ).toMatchObject({
      mode: "translated",
      translatedContent,
      translationStatus: "pending",
    });
    expect(
      resolveProjectTranslationPreview({
        requestedPreview: preview("original"),
        initialPreview,
      })?.mode
    ).toBe("original");
  });
});
