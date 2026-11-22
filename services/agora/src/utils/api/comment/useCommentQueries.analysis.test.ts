import { QueryClient } from "@tanstack/vue-query";
import { Dto } from "src/shared/types/dto";
import { expect, it, vi } from "vitest";

import { fetchAnalysisDataWithCache } from "./useCommentQueries";

it("reuses an analysis manifest only for the same viewer and language", async () => {
  const queryClient = new QueryClient();
  const fetchAnalysisFrameManifest = vi.fn(
    ({
      displayLanguage,
      viewerUserId,
    }: {
      displayLanguage: string;
      viewerUserId: string | undefined;
    }) =>
      Promise.resolve(
        Dto.analysisFrameManifest.parse({
          aiLabelsExpected: false,
          emptyReason:
            displayLanguage === "fr" ? "Aucun résultat" : "No results",
          hasVotedOnAllAvailableOpinions: viewerUserId === "alice",
          analysisViewResolution: {
            requestedView: "auto",
            canonicalView: "auto",
            resolvedGroupCount: null,
            resolvedCandidateId: null,
            resolvedBy: "no_analysis",
            variantsEnabled: false,
            options: [],
          },
        })
      )
  );
  const read = ({
    userId,
    displayLanguage,
  }: {
    userId: string;
    displayLanguage: string;
  }) =>
    fetchAnalysisDataWithCache({
      queryClient,
      fetchAnalysisFrameManifest,
      fetchAnalysisFrameContent: vi.fn(),
      fetchAnalysisFrameGroupLabels: vi.fn(),
      conversationSlugId: "audit001",
      analysisView: undefined,
      checkpointViewSnapshotId: undefined,
      aiLabelingEnabled: false,
      displayLanguage,
      spokenLanguages: ["en"],
      voteCount: 10,
      refreshScope: null,
      analysisQueryKey: undefined,
      viewerScope: { kind: "viewer", userId },
    });
  try {
    expect(
      await read({ userId: "alice", displayLanguage: "en" })
    ).toMatchObject({
      hasVotedOnAllAvailableOpinions: true,
      manifest: { emptyReason: "No results" },
    });
    expect(await read({ userId: "bob", displayLanguage: "en" })).toMatchObject({
      hasVotedOnAllAvailableOpinions: false,
      manifest: { emptyReason: "No results" },
    });
    expect(await read({ userId: "bob", displayLanguage: "fr" })).toMatchObject({
      hasVotedOnAllAvailableOpinions: false,
      manifest: { emptyReason: "Aucun résultat" },
    });
    expect(
      await read({ userId: "alice", displayLanguage: "en" })
    ).toMatchObject({
      hasVotedOnAllAvailableOpinions: true,
    });
    expect(fetchAnalysisFrameManifest).toHaveBeenCalledTimes(3);
  } finally {
    queryClient.clear();
  }
});
