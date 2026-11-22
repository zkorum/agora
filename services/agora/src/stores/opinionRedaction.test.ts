import { createPinia, setActivePinia } from "pinia";
import type { AnalysisFrameOpinionList } from "src/shared/types/dto";
import type { AnalysisOpinionItem } from "src/shared/types/zod";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import { beforeEach, describe, expect, it } from "vitest";

import { useOpinionRedactionStore } from "./opinionRedaction";

function opinion(): AnalysisOpinionItem {
  return {
    opinionSlugId: "source01",
    username: "alice",
    createdAt: new Date(),
    updatedAt: new Date(),
    isSeed: false,
    isEdited: true,
    numParticipants: 100,
    numAgrees: 50,
    numDisagrees: 40,
    numPasses: 10,
    groupAwareConsensusAgree: 0.7,
    groupAwareConsensusDisagree: 0.3,
    divisiveScore: 0.2,
    clustersStats: [
      {
        key: "0",
        isAuthorInCluster: true,
        numUsers: 60,
        numAgrees: 40,
        numDisagrees: 15,
        numPasses: 5,
      },
    ],
    content: {
      status: "visible",
      html: "SECRET",
      sourceLanguageCode: "en",
      moderation: { status: "unmoderated" },
      displayContent: {
        status: "available",
        sourceVersion: "00000000-0000-4000-8000-000000000001",
        mode: "original",
        content: { content: "SECRET" },
        translationControl: null,
      },
    },
  };
}

describe("current redaction of cached historical statements", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("erases source and attribution from a paused report without changing its mathematics", () => {
    const store = useOpinionRedactionStore();
    const data: AnalysisData = {
      consensusAgree: [opinion()],
      consensusDisagree: [],
      controversial: [],
      polisClusters: {},
    };
    store.record([{ opinionSlugId: "source01", action: "redact" }]);
    const projected = store.projectAnalysis(data);
    expect(projected.consensusAgree[0]).toMatchObject({
      numParticipants: 100,
      numAgrees: 50,
      content: { status: "redacted", reason: "statement_deleted" },
    });
    const json = JSON.stringify(projected);
    for (const field of [
      "SECRET",
      "alice",
      "username",
      "createdAt",
      "updatedAt",
      "isAuthorInCluster",
    ])
      expect(json).not.toContain(field);
    // A response started before deletion cannot put the old text back into cache.
    expect(
      store.projectOpinion({ opinion: opinion(), frameMode: "checkpoint" })
        .content.status
    ).toBe("redacted");
  });

  it("keeps seed text when only its administrator's public attribution is removed", () => {
    const store = useOpinionRedactionStore();
    store.record([{ opinionSlugId: "source01", action: "unlink_author" }]);
    const projected = store.projectOpinion({
      opinion: { ...opinion(), isSeed: true },
      frameMode: "checkpoint",
    });
    expect(projected.content.status).toBe("visible");
    expect(projected.username).toBeUndefined();
    store.record([{ opinionSlugId: "source01", action: "redact" }]);
    store.record([{ opinionSlugId: "source01", action: "unlink_author" }]);
    expect(
      store.projectOpinion({ opinion: opinion(), frameMode: "checkpoint" })
        .content.status
    ).toBe("redacted");
  });

  it("keeps account-hidden text only in checkpoints and strips attribution and translation controls", () => {
    const store = useOpinionRedactionStore();
    store.record([{ opinionSlugId: "source01", action: "hide_account" }]);
    const source = opinion();
    const historical = store.projectOpinion({
      opinion: source,
      frameMode: "checkpoint",
    });
    expect(historical.content).toMatchObject({
      status: "visible",
      html: "SECRET",
      displayContent: { translationControl: null },
    });
    expect(historical.username).toBeUndefined();
    expect(historical.createdAt).toBeUndefined();
    expect(historical.clustersStats[0].isAuthorInCluster).toBeUndefined();
    const data: AnalysisData = {
      consensusAgree: [source],
      consensusDisagree: [],
      controversial: [],
      polisClusters: {},
    };
    expect(store.projectAnalysis(data).consensusAgree).toEqual([]);
    expect(
      store.projectAnalysis({
        ...data,
        frameKey: {
          mode: "checkpoint",
          conversationViewSnapshotId: 1,
          analysisSnapshotId: 2,
          candidateId: 3,
        },
      }).consensusAgree
    ).toEqual([historical]);
    store.record([{ opinionSlugId: "source01", action: "redact" }]);
    store.record([{ opinionSlugId: "source01", action: "hide_account" }]);
    expect(
      store.projectOpinion({ opinion: source, frameMode: "checkpoint" }).content
        .status
    ).toBe("redacted");
  });

  it("recovery removes only reversible account hiding, never explicit content deletion", () => {
    const store = useOpinionRedactionStore();
    store.record([{ opinionSlugId: "source01", action: "hide_account" }]);
    store.record([{ opinionSlugId: "source01", action: "restore_account" }]);
    const restored = opinion();
    expect(
      store.projectOpinion({ opinion: restored, frameMode: "live" })
    ).toEqual(restored);
    store.record([{ opinionSlugId: "source01", action: "redact" }]);
    store.record([{ opinionSlugId: "source01", action: "restore_account" }]);
    expect(
      store.projectOpinion({ opinion: opinion(), frameMode: "checkpoint" })
        .content.status
    ).toBe("redacted");
  });

  it("drops reversible account projections after a replay gap but preserves explicit deletion", () => {
    const store = useOpinionRedactionStore();
    store.record([
      { opinionSlugId: "hidden", action: "hide_account" },
      { opinionSlugId: "seed", action: "unlink_author" },
      { opinionSlugId: "deleted", action: "redact" },
    ]);
    const before = store.resyncVersion;
    store.requireResync();
    expect(store.resyncVersion).toBe(before + 1);
    for (const opinionSlugId of ["hidden", "seed"]) {
      const fresh = { ...opinion(), opinionSlugId };
      expect(store.projectOpinion({ opinion: fresh, frameMode: "live" })).toBe(
        fresh
      );
    }
    expect(
      store.projectOpinion({
        opinion: { ...opinion(), opinionSlugId: "deleted" },
        frameMode: "checkpoint",
      }).content
    ).toEqual({ status: "redacted", reason: "statement_deleted" });
  });

  it("returns untouched frame sections without allocating when no projections are active", () => {
    const store = useOpinionRedactionStore();
    const frameKey = {
      mode: "checkpoint",
      conversationViewSnapshotId: 1,
      analysisSnapshotId: 2,
      candidateId: 3,
    } satisfies NonNullable<AnalysisData["frameKey"]>;
    const list = {
      frameKey,
      kind: "agreements",
      items: [opinion()],
    } satisfies AnalysisFrameOpinionList;
    expect(store.projectList(list)).toBe(list);
    const groups = { frameKey, clusters: {} };
    expect(store.projectGroups(groups)).toBe(groups);
  });
});
