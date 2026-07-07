import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { GetConversationExportStatusResponse } from "src/shared/types/dto";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { axiosInstance } from "../client";
import { useBackendConversationExportApi } from "./conversationExport";

const EXPORT_STATUS_POLL_INTERVAL_MS = 2000;
const EXPORT_STATUS_TRANSIENT_NOT_FOUND_GRACE_MS = 30_000;

function is404Error(error: unknown): boolean {
  return axiosInstance.isAxiosError(error) && error.response?.status === 404;
}

export function useExportHistoryQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: string;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchExportHistory } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportHistory", conversationSlugId],
    queryFn: () => fetchExportHistory(conversationSlugId),
    enabled: computed(() => toValue(enabled)),
    staleTime: 0, // Always stale - exports can change frequently
    retry: false,
  });
}

export function useRequestExportMutation() {
  const { requestNewExport } = useBackendConversationExportApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationSlugId: string) =>
      requestNewExport(conversationSlugId),
    onSuccess: (data, variables) => {
      if (data.success && data.status === "queued") {
        const status: GetConversationExportStatusResponse = {
          status: "processing",
          exportSlugId: data.exportSlugId,
          conversationSlugId: variables,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
        };
        queryClient.setQueryData(["exportStatus", data.exportSlugId], status);
      }

      // Mark export history stale without replacing the visible list with a stale replica read.
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", variables],
        refetchType: "none",
      });
    },
    retry: false,
  });
}

export function useDeleteExportMutation() {
  const { deleteExport } = useBackendConversationExportApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exportSlugId,
    }: {
      exportSlugId: string;
      conversationSlugId: string;
    }) => deleteExport(exportSlugId),
    onSuccess: (_data, variables) => {
      // Invalidate export history to remove the deleted export
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", variables.conversationSlugId],
      });
      // Remove the export status query from cache to prevent 404 refetch
      queryClient.removeQueries({
        queryKey: ["exportStatus", variables.exportSlugId],
      });
    },
    retry: false,
  });
}

export function useExportStatusQuery({
  exportSlugId,
  enabled = true,
  allowTransientNotFound = false,
}: {
  exportSlugId: string;
  enabled?: MaybeRefOrGetter<boolean>;
  allowTransientNotFound?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchExportStatus } = useBackendConversationExportApi();
  let firstNotFoundAt: number | undefined;

  return useQuery({
    queryKey: ["exportStatus", exportSlugId],
    queryFn: () => fetchExportStatus(exportSlugId),
    enabled: computed(() => toValue(enabled) && exportSlugId.length > 0),
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      if (is404Error(query.state.error)) {
        if (!toValue(allowTransientNotFound)) {
          return false;
        }

        const now = Date.now();
        firstNotFoundAt ??= now;
        if (
          now - firstNotFoundAt >
          EXPORT_STATUS_TRANSIENT_NOT_FOUND_GRACE_MS
        ) {
          return false;
        }

        return EXPORT_STATUS_POLL_INTERVAL_MS;
      }

      firstNotFoundAt = undefined;
      // Auto-refetch every 2 seconds if status is processing
      return query.state.data?.status === "processing"
        ? EXPORT_STATUS_POLL_INTERVAL_MS
        : false;
    },
    retry: false,
  });
}

export function useExportReadinessQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: string;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchExportReadiness } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportReadiness", conversationSlugId],
    queryFn: () => fetchExportReadiness(conversationSlugId),
    enabled: computed(() => toValue(enabled)),
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      // Poll every 3 seconds when:
      // - "active": User's export is processing (detect completion)
      // - "cooldown": Detect cooldown expiration OR other users changing cooldown time
      // - "ready": No polling needed (saves resources)
      const status = query.state.data?.status;
      return status === "active" || status === "cooldown" ? 3000 : false;
    },
    retry: false,
  });
}

// Utility function to invalidate export-related queries
export function useInvalidateExportQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateExportHistory: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", conversationSlugId],
      });
    },
    invalidateExportStatus: (exportSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportStatus", exportSlugId],
      });
    },
    invalidateExportReadiness: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportReadiness", conversationSlugId],
      });
    },
    invalidateAll: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["exportStatus"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["exportReadiness", conversationSlugId],
      });
    },
  };
}
