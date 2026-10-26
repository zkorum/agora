import type { QueryClient } from "@tanstack/vue-query";
import type { GetOpinionBySlugIdListResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { abortIgnoringAbortError } from "src/utils/sse/abort";

import { mapCachedOpinions, type OpinionCache } from "./opinionCache";

const REFRESH_DELAY_MS = 100;

export function createOpinionManagementRefresher({
  queryClient,
  fetchOpinions,
  onError,
}: {
  queryClient: QueryClient;
  fetchOpinions: (params: {
    opinionSlugIdList: string[];
    signal: AbortSignal;
  }) => Promise<GetOpinionBySlugIdListResponse>;
  onError: (error: unknown) => void;
}) {
  const pending = new Map<string, Set<string>>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeRequest: AbortController | undefined;
  let refreshing = false;
  let viewer: { readonly userId: string } | undefined;

  function scheduleFlush(): void {
    if (timer !== undefined || refreshing || pending.size === 0) return;
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, REFRESH_DELAY_MS);
  }

  async function flush(): Promise<void> {
    const requestedViewer = viewer;
    if (requestedViewer === undefined) return;
    refreshing = true;
    const batch = [...pending];
    pending.clear();
    try {
      for (const [conversationSlugId, opinionSlugIds] of batch) {
        if (requestedViewer !== viewer) return;
        const { userId } = requestedViewer;
        const controller = new AbortController();
        activeRequest = controller;
        try {
          const targets = await fetchOpinions({
            opinionSlugIdList: [...opinionSlugIds],
            signal: controller.signal,
          });
          if (requestedViewer !== viewer) return;
          const freshBySlugId = new Map(
            targets
              .filter(
                (target) =>
                  target.conversationSlugId === conversationSlugId &&
                  opinionSlugIds.has(target.opinion.opinionSlugId)
              )
              .map((target) => [target.opinion.opinionSlugId, target.opinion])
          );
          const applyManagement = (opinion: DisplayedOpinionItem) => {
            const fresh = freshBySlugId.get(opinion.opinionSlugId);
            return fresh === undefined ||
              fresh.displayContent.sourceVersion !==
                opinion.displayContent.sourceVersion
              ? opinion
              : { ...opinion, management: fresh.management };
          };
          queryClient.setQueriesData<OpinionCache>(
            {
              queryKey: ["comments", conversationSlugId],
              predicate: (query) => query.queryKey[3] === userId,
            },
            (cache) => mapCachedOpinions({ cache, mapOpinion: applyManagement })
          );
          for (const opinionSlugId of freshBySlugId.keys()) {
            queryClient.setQueriesData<DisplayedOpinionItem>(
              { queryKey: ["opinionTarget", opinionSlugId, userId] },
              (opinion) =>
                opinion === undefined ? opinion : applyManagement(opinion)
            );
          }
        } catch (error: unknown) {
          if (requestedViewer === viewer) onError(error);
        } finally {
          if (activeRequest === controller) activeRequest = undefined;
        }
      }
    } finally {
      refreshing = false;
      scheduleFlush();
    }
  }

  function schedule({
    conversationSlugId,
    userId,
    opinionSlugIds,
  }: {
    conversationSlugId: string;
    userId: string;
    opinionSlugIds: readonly string[];
  }): void {
    if (viewer?.userId !== userId) {
      clear();
      viewer = { userId };
    }
    const entry = pending.get(conversationSlugId) ?? new Set<string>();
    for (const slugId of opinionSlugIds) entry.add(slugId);
    pending.set(conversationSlugId, entry);
    scheduleFlush();
  }

  function clear(): void {
    viewer = undefined;
    pending.clear();
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (activeRequest !== undefined) abortIgnoringAbortError(activeRequest);
    activeRequest = undefined;
  }

  return { schedule, clear };
}
