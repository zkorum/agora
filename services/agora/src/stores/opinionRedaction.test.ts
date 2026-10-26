import { createPinia, setActivePinia } from "pinia";
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
    expect(store.projectOpinion(opinion()).content.status).toBe("redacted");
  });

  it("keeps seed text when only its administrator's public attribution is removed", () => {
    const store = useOpinionRedactionStore();
    store.record([{ opinionSlugId: "source01", action: "unlink_author" }]);
    const projected = store.projectOpinion({ ...opinion(), isSeed: true });
    expect(projected.content.status).toBe("visible");
    expect(projected.username).toBeUndefined();
    store.record([{ opinionSlugId: "source01", action: "redact" }]);
    store.record([{ opinionSlugId: "source01", action: "unlink_author" }]);
    expect(store.projectOpinion(opinion()).content.status).toBe("redacted");
  });
});
