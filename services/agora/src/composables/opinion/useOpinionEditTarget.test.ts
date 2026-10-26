import { zodDisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import type { OpinionEditRequest } from "./types";
import { useOpinionEditTarget } from "./useOpinionEditTarget";

const opinion = zodDisplayedOpinionItem.parse({
  opinionSlugId: "editstat",
  opinion: "<p>Statement</p>",
  sourceLanguageCode: "en",
  username: "author",
  isSeed: false,
  isEdited: false,
  createdAt: "2026-10-10T10:00:00Z",
  updatedAt: "2026-10-10T10:00:00Z",
  numParticipants: 0,
  numAgrees: 0,
  numDisagrees: 0,
  numPasses: 0,
  moderation: { status: "unmoderated" },
  management: { editing: { allowed: true }, canDelete: true },
  displayContent: {
    sourceVersion: "00000000-0000-4000-8000-000000000001",
    status: "available",
    mode: "original",
    content: { content: "<p>Statement</p>" },
    translationControl: null,
  },
});

function request(): OpinionEditRequest {
  return {
    opinion,
    sourceElements: {
      card: document.createElement("article"),
      content: document.createElement("div"),
    },
  };
}

describe("typed opinion edit target", () => {
  it("keeps the statement and its exact native elements together", () => {
    const target = useOpinionEditTarget();
    const selected = request();
    target.beginEditOpinion(selected);
    expect(target.editingTarget.value).toBe(selected);
    expect(target.editingOpinion.value).toBe(selected.opinion);
  });

  it("does not replace a running edit with another card's elements", () => {
    const target = useOpinionEditTarget();
    const selected = request();
    target.beginEditOpinion(selected);
    target.beginEditOpinion(request());
    expect(target.editingTarget.value).toBe(selected);
  });

  it("releases the complete target on finish and accepts a later edit", () => {
    const target = useOpinionEditTarget();
    target.beginEditOpinion(request());
    target.finishEditOpinion();
    expect(target.editingTarget.value).toBeUndefined();
    expect(target.editingOpinion.value).toBeUndefined();
    const next = request();
    target.beginEditOpinion(next);
    expect(target.editingTarget.value).toBe(next);
  });
});
