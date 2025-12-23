import { DefaultApiAxiosParamCreator } from "src/api";
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

      // EventSource doesn't support custom headers, so we use URL-based auth
      // Build UCAN token using a dummy URL structure first
      const dummyUrl = "/api/v1/notification/stream";
      const dummyOptions = { method: "GET" };
      const encodedUcan = await buildEncodedUcan(dummyUrl, dummyOptions);
      const authHeader = buildAuthorizationHeader(encodedUcan);

      // Extract the Bearer token value (remove "Bearer " prefix)
      const token = authHeader.Authorization.substring(7);

      // Get the properly formatted URL with the actual token
      const { url } =
        await DefaultApiAxiosParamCreator().apiV1NotificationStreamGet(token);

      // Construct full URL with base
      const baseUrl = processEnv.VITE_API_BASE_URL || "";
      const authUrl = `${baseUrl}${url}`;

      eventSource = new EventSource(authUrl);

      eventSource.onopen = () => {
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

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect) {
        void connect().catch((error) => {
          console.error("[SSE] Reconnection failed:", error);
        });
      }
    }, delay);
  }

  function disconnect() {
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
        await connect();
      } else if (!isLoggedIn && wasLoggedIn) {
        // User just logged out, disconnect from SSE
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
