import { ref, onUnmounted, watch } from "vue";
import { useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { DefaultApiAxiosParamCreator } from "src/api";
import { zodNotificationItem } from "src/shared/types/zod";
import type {
  SSEConnectedData,
  SSENotificationData,
  SSEHeartbeatData,
  SSEShutdownData,
} from "src/shared/types/dto";
import { useNotificationStore } from "src/stores/notification";
import { useAuthenticationStore } from "src/stores/authentication";
import { processEnv } from "src/utils/processEnv";

export function useNotificationSSE() {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const authStore = useAuthenticationStore();

  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastHeartbeat = ref<number | null>(null);
  let eventSource: EventSource | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;

  async function connect() {
    if (isConnecting.value || isConnected.value) {
      return;
    }

    try {
      isConnecting.value = true;
      console.log("[SSE] Connecting to notification stream...");

      // Build authenticated URL with UCAN token
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1NotificationStreamGet();

      const encodedUcan = await buildEncodedUcan(url, options);
      const authHeader = buildAuthorizationHeader(encodedUcan);

      // EventSource doesn't support custom headers, so pass auth token as query parameter
      // Extract the Bearer token value (remove "Bearer " prefix)
      const token = authHeader.Authorization.substring(7);

      // Construct full URL with base URL (url is relative path like /api/v1/notification/stream)
      const baseUrl = processEnv.VITE_API_BASE_URL || "";
      const fullUrl = `${baseUrl}${url}`;
      const authUrl = `${fullUrl}?auth=${encodeURIComponent(token)}`;

      eventSource = new EventSource(authUrl);

      eventSource.onopen = () => {
        console.log("[SSE] Connected to notification stream");
        isConnected.value = true;
        isConnecting.value = false;
      };

      // Handle 'connected' event
      eventSource.addEventListener("connected", (event) => {
        try {
          const data: SSEConnectedData = JSON.parse(event.data);
          lastHeartbeat.value = data.timestamp;
        } catch (error) {
          console.error("[SSE] Error processing connected event:", error);
        }
      });

      // Handle 'notification' event - this is the main one for new notifications
      eventSource.addEventListener("notification", (event) => {
        try {
          const data: SSENotificationData = JSON.parse(event.data);
          console.log("[SSE] Received notification:", data.notification);

          // Parse and validate notification with zod
          const parsedNotification = zodNotificationItem.safeParse({
            ...data.notification,
            createdAt: new Date(data.notification.createdAt),
          });

          if (parsedNotification.success) {
            // Add notification to store
            notificationStore.addNewNotification(parsedNotification.data);
          } else {
            console.error(
              "[SSE] Failed to parse notification:",
              parsedNotification.error
            );
          }
        } catch (error) {
          console.error("[SSE] Error processing notification event:", error);
        }
      });

      // Handle 'heartbeat' event
      eventSource.addEventListener("heartbeat", (event) => {
        try {
          const data: SSEHeartbeatData = JSON.parse(event.data);
          lastHeartbeat.value = data.timestamp;
        } catch (error) {
          console.error("[SSE] Error processing heartbeat event:", error);
        }
      });

      // Handle 'shutdown' event
      eventSource.addEventListener("shutdown", (event) => {
        try {
          const data: SSEShutdownData = JSON.parse(event.data);
          console.warn("[SSE] Server shutdown:", data.message);
          // Close connection but allow auto-reconnect (backend should always be available)
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          isConnected.value = false;
          isConnecting.value = false;
          // Trigger reconnection
          if (shouldReconnect) {
            scheduleReconnect();
          }
        } catch (error) {
          console.error("[SSE] Error processing shutdown event:", error);
        }
      });

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        isConnected.value = false;
        isConnecting.value = false;

        // Close the connection
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // Attempt reconnection if enabled
        if (shouldReconnect) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("[SSE] Failed to connect:", error);
      isConnecting.value = false;

      // Attempt reconnection if enabled
      if (shouldReconnect) {
        scheduleReconnect();
      }
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    // Try reconnecting after 10 seconds
    const delay = 10000;
    console.log(`[SSE] Scheduling reconnect in ${delay}ms`);

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect) {
        console.log("[SSE] Attempting reconnection...");
        void connect().catch((error) => {
          console.error("[SSE] Reconnection failed:", error);
        });
      }
    }, delay);
  }

  function disconnect() {
    console.log("[SSE] Disconnecting from notification stream");
    shouldReconnect = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    isConnected.value = false;
    isConnecting.value = false;
  }

  // Watch for authentication state changes
  watch(
    () => authStore.isLoggedIn,
    async (isLoggedIn, wasLoggedIn) => {
      if (isLoggedIn && !wasLoggedIn) {
        // User just logged in, connect to SSE
        console.log("[SSE] User logged in, connecting to notification stream");
        await connect();
      } else if (!isLoggedIn && wasLoggedIn) {
        // User just logged out, disconnect from SSE
        console.log(
          "[SSE] User logged out, disconnecting from notification stream"
        );
        disconnect();
      }
    },
    { immediate: true } // Connect immediately if already logged in
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
