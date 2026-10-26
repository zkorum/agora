import { zodDisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { applyOpinionVoteCountUpdate } from "./opinionVoteCountUpdate";

const opinion = zodDisplayedOpinionItem.parse({
  opinionSlugId: "editstat",
  opinion: "Statement",
  sourceLanguageCode: "en",
  username: "author",
  isSeed: true,
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
    content: { content: "Statement" },
    translationControl: null,
  },
});
const counts = {
  opinionSlugId: opinion.opinionSlugId,
  numParticipants: 0,
  numAgrees: 0,
  numDisagrees: 0,
  numPasses: 0,
};

describe("live edit availability", () => {
  it("refreshes edit availability independently of the eligible vote count", () => {
    const result = applyOpinionVoteCountUpdate({
      opinion,
      counts: { ...counts, numAgrees: 1 },
    });
    expect(result.opinion.management?.editing).toEqual({ allowed: true });
    expect(result.needsPermissionRefresh).toBe(true);
  });
  it("refreshes authoritative permissions instead of granting edit rights from zero counts", () => {
    const result = applyOpinionVoteCountUpdate({
      opinion: {
        ...opinion,
        management: {
          editing: { allowed: false, reason: "has_votes" },
          canDelete: true,
        },
      },
      counts,
    });
    expect(result.opinion.management?.editing).toEqual({
      allowed: false,
      reason: "has_votes",
    });
    expect(result.needsPermissionRefresh).toBe(true);
  });
  it("keeps hidden statements unavailable even if their author can delete them", () => {
    const result = applyOpinionVoteCountUpdate({
      opinion: {
        ...opinion,
        management: {
          editing: { allowed: false, reason: "not_allowed" },
          canDelete: true,
        },
        moderation: {
          status: "moderated",
          action: "hide",
          reason: "spam",
          explanation: "Hidden",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      counts,
    });
    expect(result.opinion.management?.editing).toEqual({
      allowed: false,
      reason: "not_allowed",
    });
    expect(result.needsPermissionRefresh).toBe(true);
  });
});
