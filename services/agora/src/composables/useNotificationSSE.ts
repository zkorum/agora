import { ref, onUnmounted, watch } from "vue";
import { useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { DefaultApiAxiosParamCreator } from "src/api";
import {
  zodNotificationItem,
  type NotificationItem,
} from "src/shared/types/zod";
import { useNotificationStore } from "src/stores/notification";
import { useAuthenticationStore } from "src/stores/authentication";
import { processEnv } from "src/utils/processEnv";

export interface NotificationSSEEvent {
  type: "new_notification";
  notification: NotificationItem;
}

export function useNotificationSSE() {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const authStore = useAuthenticationStore();

  const isConnected = ref(false);
  const isConnecting = ref(false);
  let eventSource: EventSource | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;

  async function connect() {
    if (isConnecting.value || isConnected.value) {
      console.log("[SSE] Already connected or connecting");
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

      eventSource.onmessage = (event) => {
        try {
          console.log("[SSE] Received message:", event.data);
          const data = JSON.parse(event.data) as NotificationSSEEvent;

          if (data.type === "new_notification") {
            // Parse and validate notification with zod
            const parsedNotification = zodNotificationItem.safeParse({
              ...data.notification,
              createdAt: new Date(data.notification.createdAt),
            });

            if (parsedNotification.success) {
              console.log("[SSE] New notification:", parsedNotification.data);
              // Add notification to store
              notificationStore.addNewNotification(parsedNotification.data);
            } else {
              console.error(
                "[SSE] Failed to parse notification:",
                parsedNotification.error
              );
            }
          }
        } catch (error) {
          console.error("[SSE] Error processing message:", error);
        }
      };

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

    // Try reconnecting after 5 seconds
    const delay = 5000;
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
  };
}
