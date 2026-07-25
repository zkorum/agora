import type { QueryClient } from "@tanstack/vue-query";
import type { SSEConversationRankingStatsUpdatedData } from "src/shared/types/dto";

const updatesByQueryClient = new WeakMap<
  QueryClient,
  Map<string, SSEConversationRankingStatsUpdatedData>
>();

export function retainConversationRankingStatsUpdate({
  queryClient,
  data,
}: {
  queryClient: QueryClient;
  data: SSEConversationRankingStatsUpdatedData;
}): boolean {
  let updates = updatesByQueryClient.get(queryClient);
  if (updates === undefined) {
    updates = new Map();
    updatesByQueryClient.set(queryClient, updates);
  }

  const previous = updates.get(data.conversationSlugId);
  if (
    previous !== undefined &&
    data.rankingStatsSnapshotId <= previous.rankingStatsSnapshotId
  ) {
    return false;
  }
  updates.set(data.conversationSlugId, data);
  return true;
}

export function getRetainedConversationRankingStatsUpdate({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): SSEConversationRankingStatsUpdatedData | undefined {
  return updatesByQueryClient.get(queryClient)?.get(conversationSlugId);
}

export function clearRetainedConversationRankingStatsUpdate({
  queryClient,
  conversationSlugId,
  throughSnapshotId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  throughSnapshotId: number;
}): void {
  const updates = updatesByQueryClient.get(queryClient);
  const retained = updates?.get(conversationSlugId);
  if (
    updates === undefined ||
    retained === undefined ||
    retained.rankingStatsSnapshotId > throughSnapshotId
  ) {
    return;
  }
  updates.delete(conversationSlugId);
  if (updates.size === 0) {
    updatesByQueryClient.delete(queryClient);
  }
}
