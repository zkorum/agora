import { QueryClient, QueryObserver } from "@tanstack/vue-query";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import { expect, it, vi } from "vitest";

import { createLiveAnalysisCatchUpController } from "./useLiveAnalysisCatchUp";

it("does not overwrite a newly selected result with a cancelled Live catch-up", async () => {
  const queryClient = new QueryClient();
  const conversationSlugId = "closed01";
  const queryKey = [
    "analysis",
    conversationSlugId,
    "auto",
    undefined,
    false,
    "en",
    [],
    { kind: "viewer", userId: "viewer" },
  ];
  const live: AnalysisData = {
    consensusAgree: [],
    consensusDisagree: [],
    controversial: [],
    polisClusters: {},
    conversationViewSnapshotId: 8,
  };
  queryClient.setQueryData(queryKey, live);
  const observer = new QueryObserver(queryClient, {
    queryKey,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => undefined);
  const late = Promise.withResolvers<AnalysisData>();
  const fetchLiveAnalysis = vi.fn(() => late.promise);
  const controller = createLiveAnalysisCatchUpController({
    queryClient,
    fetchLiveAnalysis,
  });

  try {
    controller.requestCatchUp({
      conversationSlugId,
      conversationViewSnapshotId: 9,
      analysisSnapshotId: 9,
      changeKind: "snapshot",
      checkpointChanged: false,
      displayableGroupCounts: [],
      timestamp: Date.now(),
    });
    expect(fetchLiveAnalysis).toHaveBeenCalledOnce();
    expect(fetchLiveAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        viewerScope: { kind: "viewer", userId: "viewer" },
      })
    );
    controller.clearConversation({ conversationSlugId });
    const selected = { ...live, conversationViewSnapshotId: 7 };
    queryClient.setQueryData(queryKey, selected);
    late.resolve({ ...live, conversationViewSnapshotId: 9 });
    await late.promise;
    expect(queryClient.getQueryData(queryKey)).toEqual(selected);
  } finally {
    controller.clearAll();
    unsubscribe();
    queryClient.clear();
  }
});
