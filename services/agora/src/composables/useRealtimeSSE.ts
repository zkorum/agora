import type {
  SSEConnectedData,
  SSEHeartbeatData,
  SSENotificationData,
  SSEPopularConversationData,
  SSEShutdownData,
} from "src/shared/types/dto";
import { zodNotificationItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useNotificationStore } from "src/stores/notification";
import { useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { processEnv } from "src/utils/processEnv";
import { onUnmounted, ref, watch } from "vue";

import { setNetworkOffline } from "./useNetworkStatus";

const SSE_CONNECTION_TIMEOUT_MS = 15_000;
const SSE_INITIAL_RETRY_DELAY_MS = 2_000;
const SSE_MAX_RETRY_DELAY_MS = 300_000;
// Server sends heartbeats every 30s (see services/api/src/service/realtimeSSE.ts).
// When the API stops ungracefully, reader.read() can hang indefinitely on a dead
// TCP connection. This watchdog aborts the connection after 45s of silence (1.5x
// the server interval), triggering the normal reconnect + offline detection flow.
// 1.5x is comparable to Socket.IO (~1.8x); RabbitMQ uses 2.0x for reference.
// References:
// - Socket.IO heartbeat: https://socket.io/docs/v4/how-it-works/
// - RabbitMQ heartbeat: https://www.rabbitmq.com/docs/heartbeats
// - Python websockets keepalive: https://websockets.readthedocs.io/en/stable/topics/keepalive.html
const SSE_HEARTBEAT_TIMEOUT_MS = 45_000;

/**
 * Single composable for ALL real-time server events.
 * Always maintains an SSE connection regardless of auth state:
 * - Authenticated (guest/logged-in): connects with UCAN headers → receives
 *   personal notifications + global events (new_conversation)
 * - Anonymous: connects without auth → receives only global events
 * On auth state change: disconnects from old mode → reconnects with new headers.
 */
export function useRealtimeSSE() {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const homeFeedStore = useHomeFeedStore();
  const authStore = useAuthenticationStore();

  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastHeartbeat = ref<number | null>(null);
  let abortController: AbortController | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;
  let currentRetryDelay = SSE_INITIAL_RETRY_DELAY_MS;
  let connectionId = 0;
  let hasEverConnected = false;
  let offlineTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;

  async function connect() {
    console.log("[SSE] connect() called", {
      isConnecting: isConnecting.value,
      isConnected: isConnected.value,
    });

    if (isConnecting.value || isConnected.value) {
      console.log("[SSE] connect() blocked by guard — already connecting or connected");
      return;
    }

    // Claim a new generation — all prior connections are now stale.
    // Placed AFTER the guard so a blocked connect() doesn't invalidate the active connection.
    connectionId++;
    const thisConnectionId = connectionId;

    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      isConnecting.value = true;

      abortController = new AbortController();

      // Abort if connection doesn't establish within timeout
      connectionTimeout = setTimeout(() => {
        if (thisConnectionId !== connectionId) return;
        console.warn("[SSE] Connection timed out");
        abortController?.abort();
      }, SSE_CONNECTION_TIMEOUT_MS);

      const baseUrl = processEnv.VITE_API_BASE_URL || "";
      const url = `${baseUrl}/api/v1/realtime/stream`;
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };

      // Add auth headers when authenticated
      // Future: replace buildEncodedUcan with Bearer token when migrating to JWT
      if (authStore.isGuestOrLoggedIn) {
        const encodedUcan = await buildEncodedUcan(
          "/api/v1/realtime/stream",
          { method: "GET" },
        );
        const authHeader = buildAuthorizationHeader(encodedUcan);
        Object.assign(headers, authHeader);
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
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
      resetHeartbeatWatchdog();

      // Clear offline timer if SSE reconnected quickly (< 3s)
      if (offlineTimer) {
        clearTimeout(offlineTimer);
        offlineTimer = null;
      }

      if (hasEverConnected) {
        console.log("[SSE] Reconnected — clearing offline state");
      }
      setNetworkOffline(false);
      hasEverConnected = true;

      // Read and parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetHeartbeatWatchdog();

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

      // Stream ended normally — check staleness before touching shared state
      clearHeartbeatWatchdog();
      if (thisConnectionId !== connectionId) return;

      isConnected.value = false;
      scheduleOfflineTimer();
      if (shouldReconnect) {
        scheduleReconnect();
      }
    } catch (error) {
      clearHeartbeatWatchdog();
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      // Stale connection — a newer connect() has taken over.
      // Don't touch shared state or schedule reconnects.
      if (thisConnectionId !== connectionId) return;

      console.error("[SSE] Connection error:", error);
      isConnected.value = false;
      isConnecting.value = false;
      scheduleOfflineTimer();

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
        case "new_conversation": {
          homeFeedStore.hasPendingNewTab = true;
          break;
        }
        case "popular_conversation": {
          const data: SSEPopularConversationData = JSON.parse(rawData);
          homeFeedStore.onPopularConversationUpdate(
            data.topConversationSlugIdList
          );
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

  function resetHeartbeatWatchdog() {
    if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
    heartbeatWatchdog = setTimeout(() => {
      heartbeatWatchdog = null;
      console.warn("[SSE] Heartbeat timeout — aborting connection");
      if (abortController) {
        abortController.abort();
      }
    }, SSE_HEARTBEAT_TIMEOUT_MS);
  }

  function clearHeartbeatWatchdog() {
    if (heartbeatWatchdog) {
      clearTimeout(heartbeatWatchdog);
      heartbeatWatchdog = null;
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

  function scheduleOfflineTimer() {
    if (offlineTimer) {
      return;
    }
    console.log("[SSE] Scheduling offline timer (3s)");
    // Delay 3 seconds before marking offline (avoids flash on brief disconnects)
    offlineTimer = setTimeout(() => {
      offlineTimer = null;
      console.log("[SSE] Offline timer fired — marking offline");
      setNetworkOffline(true);
    }, 3000);
  }

  function forceReconnect() {
    console.log("[SSE] forceReconnect() — aborting current connection and reconnecting");
    clearHeartbeatWatchdog();
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
    void connect();
  }

  function disconnect() {
    connectionId++; // Invalidate any in-flight connect() catch handler
    shouldReconnect = false;
    currentRetryDelay = SSE_INITIAL_RETRY_DELAY_MS;
    clearHeartbeatWatchdog();

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Only clear the pending offline timer — don't touch global offline state.
    // The new connection will call setNetworkOffline(false) when it succeeds.
    if (offlineTimer) {
      clearTimeout(offlineTimer);
      offlineTimer = null;
    }

    isConnected.value = false;
    isConnecting.value = false;
  }

  // Watch for authentication state changes — reconnect to switch auth mode.
  // Always connected: authenticated users get personal notifications + global
  // events; anonymous users get only global events.
  watch(
    () => authStore.isGuestOrLoggedIn,
    async (isAuthenticated, wasAuthenticated) => {
      console.log("[SSE] Auth watcher fired", { isAuthenticated, wasAuthenticated });
      if (isAuthenticated !== wasAuthenticated) {
        // Auth state changed — disconnect and reconnect with appropriate headers
        disconnect();
        shouldReconnect = true;
        await connect();
      }
    },
    { immediate: true } // Connect on mount regardless of auth state
  );

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    forceReconnect,
    isConnected,
    isConnecting,
    lastHeartbeat,
  };
}
