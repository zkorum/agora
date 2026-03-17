import type {
  SSEConnectedData,
  SSEHeartbeatData,
  SSENotificationData,
  SSEShutdownData,
} from "src/shared/types/dto";
import { zodNotificationItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { processEnv } from "src/utils/processEnv";
import { onUnmounted, ref, watch } from "vue";

const SSE_CONNECTION_TIMEOUT_MS = 15_000;
const SSE_INITIAL_RETRY_DELAY_MS = 2_000;
const SSE_MAX_RETRY_DELAY_MS = 300_000;

export function useNotificationSSE() {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const authStore = useAuthenticationStore();

  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastHeartbeat = ref<number | null>(null);
  let abortController: AbortController | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;
  let currentRetryDelay = SSE_INITIAL_RETRY_DELAY_MS;

  async function connect() {
    console.log("[SSE] connect() called", {
      isConnecting: isConnecting.value,
      isConnected: isConnected.value,
    });

    if (isConnecting.value || isConnected.value) {
      console.log("[SSE] connect() blocked by guard — already connecting or connected");
      return;
    }

    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      isConnecting.value = true;

      abortController = new AbortController();

      // Abort if connection doesn't establish within timeout
      connectionTimeout = setTimeout(() => {
        console.warn("[SSE] Connection timed out");
        abortController?.abort();
      }, SSE_CONNECTION_TIMEOUT_MS);

      // Fresh UCAN for each connection attempt — prevents replay guard rejection
      const encodedUcan = await buildEncodedUcan(
        "/api/v1/notification/stream",
        { method: "GET" },
      );
      const authHeader = buildAuthorizationHeader(encodedUcan);

      // In dev, use empty base so the request goes through the Vite proxy
      const baseUrl = process.env.DEV ? "" : (processEnv.VITE_API_BASE_URL || "");
      const url = `${baseUrl}/api/v1/notification/stream`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...authHeader,
          Accept: "text/event-stream",
        },
        signal: abortController.signal,
      });

      clearTimeout(connectionTimeout);
      connectionTimeout = null;

      console.log("[SSE] Response received", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        hasBody: !!response.body,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${String(response.status)}`);
      }

      if (!response.body) {
        throw new Error("SSE response has no body");
      }

      isConnected.value = true;
      isConnecting.value = false;
      currentRetryDelay = SSE_INITIAL_RETRY_DELAY_MS;
      console.log("[SSE] Stream opened successfully");

      // Read and parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE events are separated by double newlines
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const parsed = parseSSEEvent(part);
            handleSSEEvent(parsed.event, parsed.data);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (!shouldReconnect) {
            return; // Intentional disconnect — don't reconnect
          }
          // Timeout or other abort while shouldReconnect is true — fall through to reconnect
          throw error;
        }
        throw error;
      }

      // Stream ended normally — reconnect
      isConnected.value = false;
      if (shouldReconnect) {
        scheduleReconnect();
      }
    } catch (error) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      console.error("[SSE] Connection error:", error);
      isConnected.value = false;
      isConnecting.value = false;

      if (shouldReconnect) {
        scheduleReconnect();
      }
    }
  }

  function parseSSEEvent(raw: string): { event: string; data: string } {
    let event = "";
    let data = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event: ")) {
        event = line.slice(7);
      } else if (line.startsWith("data: ")) {
        data = line.slice(6);
      }
    }
    return { event, data };
  }

  function handleSSEEvent(event: string, rawData: string): void {
    try {
      switch (event) {
        case "connected": {
          const data: SSEConnectedData = JSON.parse(rawData);
          lastHeartbeat.value = data.timestamp;
          break;
        }
        case "notification": {
          const data: SSENotificationData = JSON.parse(rawData);
          const parsedNotification = zodNotificationItem.safeParse({
            ...data.notification,
            createdAt: new Date(data.notification.createdAt),
          });
          if (parsedNotification.success) {
            notificationStore.addNewNotification(parsedNotification.data);
          } else {
            console.error(
              "[SSE] Failed to parse notification:",
              parsedNotification.error
            );
          }
          break;
        }
        case "heartbeat": {
          const data: SSEHeartbeatData = JSON.parse(rawData);
          lastHeartbeat.value = data.timestamp;
          break;
        }
        case "shutdown": {
          const data: SSEShutdownData = JSON.parse(rawData);
          console.warn("[SSE] Server shutdown:", data.message);
          break;
        }
      }
    } catch (error) {
      console.error(`[SSE] Error processing ${event} event:`, error);
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    console.log(`[SSE] Reconnecting in ${currentRetryDelay / 1000}s`);

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect) {
        void connect().catch((error) => {
          console.error("[SSE] Reconnection failed:", error);
        });
      }
    }, currentRetryDelay);

    // Exponential backoff: double delay each time, capped at max
    currentRetryDelay = Math.min(currentRetryDelay * 2, SSE_MAX_RETRY_DELAY_MS);
  }

  function disconnect() {
    shouldReconnect = false;
    currentRetryDelay = SSE_INITIAL_RETRY_DELAY_MS;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    isConnected.value = false;
    isConnecting.value = false;
  }

  // Watch for authentication state changes (guests + logged-in users)
  watch(
    () => authStore.isGuestOrLoggedIn,
    async (isAuthenticated, wasAuthenticated) => {
      console.log("[SSE] Auth watcher fired", { isAuthenticated, wasAuthenticated });
      if (isAuthenticated && !wasAuthenticated) {
        // User became guest or logged in — connect to SSE
        shouldReconnect = true;
        await connect();
      } else if (!isAuthenticated && wasAuthenticated) {
        // User logged out or cleared state — disconnect from SSE
        disconnect();
      }
    },
    { immediate: true } // Connect immediately if already authenticated
  );

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    lastHeartbeat,
  };
}
