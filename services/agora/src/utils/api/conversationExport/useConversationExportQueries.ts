import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useBackendConversationExportApi } from "./conversationExport";

export function useExportHistoryQuery({
  conversationSlugId,
  enabled = true,
}: {
  conversationSlugId: string;
  enabled?: boolean;
}) {
  const { fetchExportHistory } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportHistory", conversationSlugId],
    queryFn: () => fetchExportHistory(conversationSlugId),
    enabled: enabled && conversationSlugId.length > 0,
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

export function useExportStatusQuery({
  exportSlugId,
  enabled = true,
}: {
  exportSlugId: string;
  enabled?: boolean;
}) {
  const { fetchExportStatus } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportStatus", exportSlugId],
    queryFn: () => fetchExportStatus(exportSlugId),
    enabled: enabled && exportSlugId.length > 0,
    staleTime: 0, // Always stale
    refetchInterval: (query) => {
      // Auto-refetch every 2 seconds if status is processing
      return query.state.data?.status === "processing" ? 2000 : false;
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
    invalidateAll: (conversationSlugId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportHistory", conversationSlugId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["exportStatus"],
      });
    },
  };
}
