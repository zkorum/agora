import type { InfiniteData, QueryClient } from "@tanstack/vue-query";
import type {
  FetchFeedResponse,
  FetchProjectPageResponse,
  ProjectPageActivity,
  SSEConversationQvStatsUpdatedData,
} from "src/shared/types/dto";
import type {
  ConversationMetadata,
  ExtendedConversation,
} from "src/shared/types/zod";

import type { ConversationDetail } from "./useConversationQuery";

const updatesByClient = new WeakMap<
  QueryClient,
  Map<string, SSEConversationQvStatsUpdatedData>
>();

export function clearRetainedQvStats(queryClient: QueryClient): void {
  updatesByClient.delete(queryClient);
}

export function getRetainedQvStats({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): SSEConversationQvStatsUpdatedData | undefined {
  return updatesByClient.get(queryClient)?.get(conversationSlugId);
}

export function retainQvStats({
  queryClient,
  data,
}: {
  queryClient: QueryClient;
  data: SSEConversationQvStatsUpdatedData;
}): boolean {
  let updates = updatesByClient.get(queryClient);
  if (updates === undefined) {
    updates = new Map();
    updatesByClient.set(queryClient, updates);
  }
  const previous = updates.get(data.conversationSlugId);
  if (
    previous !== undefined &&
    previous.qvStatsRevision >= data.qvStatsRevision
  )
    return false;
  updates.set(data.conversationSlugId, data);
  return true;
}

export function applyQvStats<T extends { metadata: ConversationMetadata }>({
  conversation,
  data,
}: {
  conversation: T;
  data: SSEConversationQvStatsUpdatedData;
}): T {
  const metadata = conversation.metadata;
  if (
    metadata.conversationSlugId !== data.conversationSlugId ||
    metadata.conversationType !== "prioritizing" ||
    metadata.prioritizationType !== "qv" ||
    (metadata.qvStatsRevision !== undefined &&
      metadata.qvStatsRevision >= data.qvStatsRevision)
  )
    return conversation;
  // Never copy isClosed, finalization or result fields from a live counter event.
  return {
    ...conversation,
    metadata: {
      ...metadata,
      qvStatsRevision: data.qvStatsRevision,
      participantCount: data.participantCount,
      totalParticipantCount: data.participantCount,
    },
  };
}

export function reconcileQvStats<T extends { metadata: ConversationMetadata }>({
  queryClient,
  conversation,
}: {
  queryClient: QueryClient;
  conversation: T;
}): T {
  const metadata = conversation.metadata;
  if (
    metadata.conversationType !== "prioritizing" ||
    metadata.prioritizationType !== "qv"
  )
    return conversation;
  if (metadata.qvStatsRevision !== undefined)
    retainQvStats({
      queryClient,
      data: {
        conversationSlugId: metadata.conversationSlugId,
        qvStatsRevision: metadata.qvStatsRevision,
        participantCount: metadata.participantCount,
      },
    });
  const data = updatesByClient
    .get(queryClient)
    ?.get(metadata.conversationSlugId);
  return data === undefined
    ? conversation
    : applyQvStats({ conversation, data });
}

export function reconcileProjectQvStats({
  queryClient,
  activity,
}: {
  queryClient: QueryClient;
  activity: ProjectPageActivity;
}): ProjectPageActivity {
  if (!activity.isIndexed || activity.prioritizationType !== "qv")
    return activity;
  if (activity.stats.qvStatsRevision !== undefined)
    retainQvStats({
      queryClient,
      data: {
        conversationSlugId: activity.slugId,
        qvStatsRevision: activity.stats.qvStatsRevision,
        participantCount: activity.stats.participantCount,
      },
    });
  const data = updatesByClient.get(queryClient)?.get(activity.slugId);
  if (
    data === undefined ||
    (activity.stats.qvStatsRevision !== undefined &&
      activity.stats.qvStatsRevision >= data.qvStatsRevision)
  )
    return activity;
  return {
    ...activity,
    stats: {
      ...activity.stats,
      qvStatsRevision: data.qvStatsRevision,
      participantCount: data.participantCount,
    },
  };
}

export function invalidateProjectQvStats({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): void {
  const projects = new Set<string>();
  const retainProject = (metadata: ConversationMetadata) => {
    if (metadata.conversationSlugId !== conversationSlugId) return;
    const slug =
      metadata.currentProjectSlug ?? metadata.projectContext?.projectSlug;
    if (slug !== undefined) projects.add(slug);
  };
  for (const [, data] of queryClient.getQueriesData<
    ExtendedConversation | ConversationDetail
  >({
    queryKey: ["conversation", conversationSlugId],
  })) {
    if (data !== undefined)
      retainProject(
        "conversationData" in data
          ? data.conversationData.metadata
          : data.metadata
      );
  }
  for (const [, feed] of queryClient.getQueriesData<
    InfiniteData<FetchFeedResponse>
  >({ queryKey: ["feed"] })) {
    for (const page of feed?.pages ?? []) {
      for (const item of page.feedItemList)
        retainProject(item.conversationData.metadata);
    }
  }
  for (const [
    key,
    page,
  ] of queryClient.getQueriesData<FetchProjectPageResponse>({
    queryKey: ["projectPage"],
  })) {
    if (
      page?.activities.some(
        (activity) =>
          activity.isIndexed && activity.slugId === conversationSlugId
      ) &&
      typeof key[1] === "string"
    ) {
      projects.add(key[1]);
    }
  }
  // Totals include unloaded activities. When no cached relationship identifies
  // the project, mark other pages stale for reactivation but fetch visible pages
  // only. Otherwise an off-page activity could leave a fresh inactive total stale.
  if (projects.size === 0) {
    void queryClient.invalidateQueries({
      queryKey: ["projectPage"],
      refetchType: "none",
    });
    void queryClient.refetchQueries({
      queryKey: ["projectPage"],
      type: "active",
    });
    return;
  }
  void queryClient.invalidateQueries({
    queryKey: ["projectPage"],
    predicate: (query) =>
      typeof query.queryKey[1] === "string" && projects.has(query.queryKey[1]),
  });
}
