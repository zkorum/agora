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
    staleTime: 0, // Always stale - exports can change frequently during processing
    refetchInterval: (query) => {
      // Auto-refetch every 5 seconds if there are processing exports
      const hasProcessing = query.state.data?.some(
        (item) => item.status === "processing"
      );
      if (hasProcessing) {
        return 5000;
      }

      // Auto-refetch if any completed export has a URL expiring in less than 30 minutes
      const hasExpiringUrl = query.state.data?.some((item) => {
        if (item.status !== "completed" || !item.urlExpiresAt) {
          return false;
        }
        const expiryTime = new Date(item.urlExpiresAt).getTime();
        const now = Date.now();
        const thirtyMinutesInMs = 30 * 60 * 1000;
        return expiryTime - now < thirtyMinutesInMs;
      });

      return hasExpiringUrl ? 10000 : false;
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
    staleTime: 0, // Always stale
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
