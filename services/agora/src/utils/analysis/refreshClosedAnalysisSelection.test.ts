import { QueryClient } from "@tanstack/vue-query";
import { expect, it } from "vitest";

import { refreshClosedAnalysisSelection } from "./refreshClosedAnalysisSelection";

it("invalidates selected results without touching exact checkpoint caches", async () => {
  const queryClient = new QueryClient();
  const conversationSlugId = "closed01";
  const keys = [
    ["analysisFrameManifest", conversationSlugId, "auto", undefined],
    ["analysis", conversationSlugId, "auto", undefined],
    ["survey-results-aggregated", conversationSlugId, "auto", undefined],
    ["analysisFrameManifest", conversationSlugId, "auto", 8],
    ["analysis", conversationSlugId, "auto", 8],
    ["survey-results-aggregated", conversationSlugId, "auto", 8],
    ["analysis", "other001", "auto", undefined],
  ];
  for (const key of keys) queryClient.setQueryData(key, { loaded: true });
  const analysisKey = ["analysis", conversationSlugId, "auto", undefined];
  const lateResponse = Promise.withResolvers<{ loaded: boolean }>();
  const inFlight = queryClient.fetchQuery({
    queryKey: analysisKey,
    queryFn: () => lateResponse.promise,
  });
  expect(queryClient.getQueryState(analysisKey)?.fetchStatus).toBe("fetching");
  await refreshClosedAnalysisSelection({ queryClient, conversationSlugId });
  lateResponse.resolve({ loaded: false });
  await expect(inFlight).resolves.toEqual({ loaded: true });
  expect(queryClient.getQueryData(analysisKey)).toEqual({ loaded: true });
  expect(
    keys.map((key) => queryClient.getQueryState(key)?.isInvalidated)
  ).toEqual([true, true, true, false, false, false, false]);
  expect(keys.every((key) => queryClient.getQueryData(key) !== undefined)).toBe(
    true
  );
  queryClient.clear();
});

it("refreshes the updated closing link without invalidating earlier history or Live", async () => {
  const queryClient = new QueryClient();
  const conversationSlugId = "closed01";
  const keys = [
    ["analysisFrameManifest", conversationSlugId, "auto", 8],
    ["analysis", conversationSlugId, "auto", 8],
    ["survey-results-aggregated", conversationSlugId, "auto", 8],
    ["analysis", conversationSlugId, "auto", 6],
    ["analysis", conversationSlugId, "auto", undefined],
  ];
  for (const key of keys) queryClient.setQueryData(key, { loaded: true });
  await refreshClosedAnalysisSelection({
    queryClient,
    conversationSlugId,
    closingCheckpointIds: [8],
    includeLatest: false,
  });
  expect(
    keys.map((key) => queryClient.getQueryState(key)?.isInvalidated)
  ).toEqual([true, true, true, false, false]);
  queryClient.clear();
});
