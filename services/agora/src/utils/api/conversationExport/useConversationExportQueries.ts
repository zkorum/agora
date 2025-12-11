import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useBackendConversationExportApi } from "./conversationExport";

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
    enabled: computed(() => toValue(enabled) && conversationSlugId.length > 0),
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
    onSuccess: (_data, variables) => {
      // Invalidate export history to show the new export request
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", variables],
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
}: {
  exportSlugId: string;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchExportStatus } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportStatus", exportSlugId],
    queryFn: () => fetchExportStatus(exportSlugId),
    enabled: computed(() => toValue(enabled) && exportSlugId.length > 0),
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      // Auto-refetch every 2 seconds if status is processing
      return query.state.data?.status === "processing" ? 2000 : false;
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
    enabled: computed(() => toValue(enabled) && conversationSlugId.length > 0),
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
