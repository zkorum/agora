import { useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { axiosInstance } from "../client";
import { useBackendPostApi } from "../post/post";

// Poll interval for import status updates when processing
const IMPORT_STATUS_POLL_INTERVAL_MS = 2000;

// Poll interval for checking active imports (slower since we just need to unblock UI)
const ACTIVE_IMPORT_POLL_INTERVAL_MS = 3000;

function is404Error(error: unknown): boolean {
  return axiosInstance.isAxiosError(error) && error.response?.status === 404;
}

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
      // Keep polling on 404 errors (read replica lag)
      if (is404Error(query.state.error)) {
        return IMPORT_STATUS_POLL_INTERVAL_MS;
      }
      // Auto-refetch every 2 seconds if status is processing
      return query.state.data?.status === "processing"
        ? IMPORT_STATUS_POLL_INTERVAL_MS
        : false;
    },
    retry: false,
  });
}

export function useActiveImportQuery({
  enabled = true,
}: {
  enabled?: MaybeRefOrGetter<boolean>;
} = {}) {
  const { getActiveImport } = useBackendPostApi();

  return useQuery({
    queryKey: ["activeImport"],
    queryFn: () => getActiveImport(),
    enabled: computed(() => toValue(enabled)),
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      // Poll every 3 seconds if there's an active import to detect when it completes
      return query.state.data?.hasActiveImport
        ? ACTIVE_IMPORT_POLL_INTERVAL_MS
        : false;
    },
    retry: false,
  });
}
