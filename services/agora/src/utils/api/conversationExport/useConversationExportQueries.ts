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
    staleTime: 1000 * 30, // 30 seconds - exports can change frequently during processing
    refetchInterval: (query) => {
      // Auto-refetch every 10 seconds if there are processing exports
      const hasProcessing = query.state.data?.some(
        (item) => item.status === "processing"
      );
      return hasProcessing ? 10000 : false;
    },
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
  exportId,
  enabled = true,
}: {
  exportId: number;
  enabled?: boolean;
}) {
  const { fetchExportStatus } = useBackendConversationExportApi();

  return useQuery({
    queryKey: ["exportStatus", exportId],
    queryFn: () => fetchExportStatus(exportId),
    enabled: enabled && exportId > 0,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: (query) => {
      // Auto-refetch every 10 seconds if status is processing
      return query.state.data?.status === "processing" ? 10000 : false;
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
    invalidateExportStatus: (exportId: number) => {
      void queryClient.invalidateQueries({
        queryKey: ["exportStatus", exportId],
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
