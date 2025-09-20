import { boot } from "quasar/wrappers";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import type { AxiosErrorResponse } from "src/utils/api/common";
import { isTimeoutError, shouldRetryError } from "src/utils/api/common";

// Create a client with custom configuration for our timeout and retry needs
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache time - keep unused data for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry configuration based on our error handling logic
      retry: (failureCount, error) => {
        // Don't retry more than 3 times
        if (failureCount >= 3) return false;

        // Check if it's an Axios error and should be retried
        const axiosError = error as AxiosErrorResponse;
        if (axiosError.code) {
          return shouldRetryError(axiosError.code);
        }

        // For non-Axios errors, retry network and server errors
        return (
          error instanceof Error &&
          (error.message.includes("Network") ||
            error.message.includes("timeout") ||
            error.message.includes("fetch"))
        );
      },
      // Exponential backoff with jitter
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Keep data fresh while refetching in background
      refetchOnWindowFocus: false,
      // Background refetch interval for important data
      refetchInterval: false,
    },
    mutations: {
      // Retry mutations for timeout/network errors
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;

        const axiosError = error as AxiosErrorResponse;
        if (axiosError.code) {
          return (
            isTimeoutError(axiosError.code) || axiosError.code === "ERR_NETWORK"
          );
        }

        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

export default boot(({ app }) => {
  app.use(VueQueryPlugin, {
    queryClient,
  });
});

export { queryClient };
