import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useBackendPostApi } from "../post/post";

// Poll interval for import status updates when processing
const IMPORT_STATUS_POLL_INTERVAL_MS = 2000;

export function useImportStatusQuery({
  importSlugId,
  enabled = true,
}: {
  importSlugId: string;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { getConversationImportStatus } = useBackendPostApi();

  return useQuery({
    queryKey: ["importStatus", importSlugId],
    queryFn: () => getConversationImportStatus(importSlugId),
    enabled: computed(() => toValue(enabled) && importSlugId.length > 0),
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      // Auto-refetch every 2 seconds if status is processing
      return query.state.data?.status === "processing"
        ? IMPORT_STATUS_POLL_INTERVAL_MS
        : false;
    },
    retry: false,
  });
}
