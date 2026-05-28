import { useQueryClient } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type AnySSEEvent,
  type SSEConversationAnalysisUpdatedData,
  type SSEConversationSettingsUpdatedData,
  zodSSEEventDataByType,
} from "src/shared/types/dto";
import type {
  ExtendedConversation,
  ParticipationMode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useNotificationStore } from "src/stores/notification";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useBackendAuthApi } from "src/utils/api/auth";
import type { AnalysisData } from "src/utils/api/comment/comment";
import { useCommonApi } from "src/utils/api/common";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { processEnv } from "src/utils/processEnv";
import { useNotify } from "src/utils/ui/notify";
import {
  type MaybeRefOrGetter,
  onUnmounted,
  ref,
  toValue,
  watch,
} from "vue";

import { setNetworkOffline } from "./useNetworkStatus";
import {
  type RealtimeSSETranslations,
  realtimeSSETranslations,
} from "./useRealtimeSSE.i18n";

const SSE_CONNECTION_TIMEOUT_MS = 15_000;
const SSE_RETRY_DELAY_MS = 1_000;
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
const LIVE_ANALYSIS_CATCH_UP_DELAYS_MS = [250, 500, 1000, 2000] as const;

function isAnalysisQueryKeyForConversation({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return queryKey[0] === "analysis" && queryKey[1] === conversationSlugId;
}

function isLiveAnalysisQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    isAnalysisQueryKeyForConversation({ queryKey, conversationSlugId }) &&
    queryKey[3] === undefined
  );
}

function isFacilitatorPreferenceLiveAnalysisQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    isLiveAnalysisQueryKey({ queryKey, conversationSlugId }) &&
    (queryKey[2] === undefined || queryKey[2] === "facilitator_preference")
  );
}

function shouldRefetchLiveAnalysisForSettingsUpdate({
  queryKey,
  conversationSlugId,
  preferredOpinionGroupCountChanged,
  aiLabelingEnabledChanged,
  aiLabelingEnabled,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
  preferredOpinionGroupCountChanged: boolean;
  aiLabelingEnabledChanged: boolean;
  aiLabelingEnabled: boolean;
}): boolean {
  if (!isLiveAnalysisQueryKey({ queryKey, conversationSlugId })) {
    return false;
  }

  if (preferredOpinionGroupCountChanged) {
    return isFacilitatorPreferenceLiveAnalysisQueryKey({
      queryKey,
      conversationSlugId,
    });
  }

  return aiLabelingEnabledChanged && aiLabelingEnabled;
}

function isCheckpointAnalysisQueryKey({
  queryKey,
  conversationSlugId,
  checkpointViewSnapshotId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
  checkpointViewSnapshotId: number;
}): boolean {
  return (
    isAnalysisQueryKeyForConversation({ queryKey, conversationSlugId }) &&
    queryKey[3] === checkpointViewSnapshotId
  );
}

function isAnalysisCheckpointsQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    queryKey[0] === "analysisCheckpoints" && queryKey[1] === conversationSlugId
  );
}

function isConversationCommentsQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    (queryKey[0] === "comments" || queryKey[0] === "hiddenComments") &&
    queryKey[1] === conversationSlugId
  );
}

/**
 * Single composable for ALL real-time server events.
 * Always maintains an SSE connection regardless of auth state:
 * - Authenticated (guest/logged-in): connects with UCAN headers → receives
 *   personal notifications + global events (new_conversation)
 * - Anonymous: connects without auth → receives only global events
 * On auth state change: disconnects from old mode → reconnects with new headers.
 */
export function useRealtimeSSE({
  subscribedConversationSlugId,
}: {
  subscribedConversationSlugId?: MaybeRefOrGetter<string | undefined>;
} = {}) {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const homeFeedStore = useHomeFeedStore();
  const opinionUpdatesStore = useOpinionUpdatesStore();
  const authStore = useAuthenticationStore();
  const queryClient = useQueryClient();
  const { refreshAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<RealtimeSSETranslations>(
    realtimeSSETranslations
  );

  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastHeartbeat = ref<number | null>(null);
  let abortController: AbortController | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;
  let connectionId = 0;
  let offlineTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;
  const latestExpectedLiveSnapshotByConversationSlugId = new Map<
    string,
    number
  >();
  const liveAnalysisCatchUpGenerationByConversationSlugId = new Map<
    string,
    number
  >();
  const liveAnalysisCatchUpTimeoutByConversationSlugId = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const latestAnalysisEventTimestampByConversationSlugId = new Map<
    string,
    number
  >();
  const latestSettingsEventTimestampByConversationSlugId = new Map<
    string,
    number
  >();

  function getSubscribedConversationSlugId(): string | undefined {
    return toValue(subscribedConversationSlugId);
  }

  function buildRealtimeStreamUrl(): string {
    const baseUrl = processEnv.VITE_API_BASE_URL || "";
    const path = "/api/v1/realtime/stream";
    const conversationSlugId = getSubscribedConversationSlugId();
    if (conversationSlugId === undefined) {
      return `${baseUrl}${path}`;
    }

    const params = new URLSearchParams({ conversationSlugId });
    return `${baseUrl}${path}?${params.toString()}`;
  }

  async function connect() {
    if (isConnecting.value || isConnected.value) {
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
        abortController?.abort();
      }, SSE_CONNECTION_TIMEOUT_MS);

      const url = buildRealtimeStreamUrl();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };

      // Add auth headers when authenticated
      // Future: replace buildEncodedUcan with Bearer token when migrating to JWT
      if (authStore.isGuestOrLoggedIn) {
        const encodedUcan = await buildEncodedUcan("/api/v1/realtime/stream", {
          method: "GET",
        });
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

      if (!response.ok) {
        if (response.status === 401) {
          const didRefreshAuthState = await refreshAuthStateAfterSSEUnauthorized();
          if (didRefreshAuthState) {
            isConnecting.value = false;
            isConnected.value = false;
            setNetworkOffline(false);
            if (thisConnectionId === connectionId && shouldReconnect) {
              scheduleReconnect();
            }
            return;
          }
        }
        throw new Error(`SSE connection failed: ${String(response.status)}`);
      }

      if (!response.body) {
        throw new Error("SSE response has no body");
      }

      isConnected.value = true;
      isConnecting.value = false;
      resetHeartbeatWatchdog();

      // Clear offline timer if SSE reconnected quickly (< 3s)
      if (offlineTimer) {
        clearTimeout(offlineTimer);
        offlineTimer = null;
      }

      setNetworkOffline(false);
      refreshActiveConversationQueriesAfterReconnect({
        conversationSlugId: getSubscribedConversationSlugId(),
      });

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
          if (parsed !== undefined) {
            handleSSEEvent(parsed);
          }
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
    } catch {
      clearHeartbeatWatchdog();
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      // Stale connection — a newer connect() has taken over.
      // Don't touch shared state or schedule reconnects.
      if (thisConnectionId !== connectionId) return;

      isConnected.value = false;
      isConnecting.value = false;
      scheduleOfflineTimer();

      if (shouldReconnect) {
        scheduleReconnect();
      }
    }
  }

  function normalizeSSELine(rawLine: string): string {
    return rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
  }

  function parseRawSSEFrame(raw: string): { event: string; data: string } {
    let event = "";
    const dataLines: string[] = [];
    for (const rawLine of raw.split("\n")) {
      const line = normalizeSSELine(rawLine);
      if (line.startsWith(":")) {
        continue;
      }

      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trimStart();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }
    return { event, data: dataLines.join("\n") };
  }

  function parseSSEEvent(raw: string): AnySSEEvent | undefined {
    const frame = parseRawSSEFrame(raw);
    const data = frame.data.trim();
    if (frame.event === "" && data === "") {
      return undefined;
    }

    if (data === "") {
      return undefined;
    }

    let rawData: unknown;

    try {
      rawData = JSON.parse(data);
    } catch (error) {
      console.error("Failed to parse SSE event JSON", error);
      return undefined;
    }

    switch (frame.event) {
      case "connected": {
        const result = zodSSEEventDataByType.connected.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "notification": {
        const result = zodSSEEventDataByType.notification.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "new_conversation": {
        const result = zodSSEEventDataByType.new_conversation.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "new_opinion": {
        const result = zodSSEEventDataByType.new_opinion.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "popular_conversation": {
        const result = zodSSEEventDataByType.popular_conversation.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "conversation_analysis_updated": {
        const result = zodSSEEventDataByType.conversation_analysis_updated.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "conversation_settings_updated": {
        const result = zodSSEEventDataByType.conversation_settings_updated.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "heartbeat": {
        const result = zodSSEEventDataByType.heartbeat.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      case "shutdown": {
        const result = zodSSEEventDataByType.shutdown.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return { event: frame.event, data: result.data };
      }
      default:
        console.error(`Unknown SSE event: ${frame.event}`);
        return undefined;
    }
  }

  function logInvalidSSEPayload({
    event,
    error,
  }: {
    event: string;
    error: unknown;
  }): void {
    console.error(`Invalid SSE payload for event ${event}`, error);
  }

  async function refreshAuthStateAfterSSEUnauthorized(): Promise<boolean> {
    try {
      const result = await refreshAuthState();
      return result.authStateChanged || result.needsCacheRefresh;
    } catch (error) {
      console.error("Failed to refresh auth state after SSE 401", error);
      return false;
    }
  }

  function getParticipationModeMessage(
    participationMode: ParticipationMode
  ): string {
    switch (participationMode) {
      case "guest": {
        return t("participationGuestAllowed");
      }
      case "account_required": {
        return t("participationAccountRequired");
      }
      case "email_verification": {
        return t("participationEmailVerificationRequired");
      }
      case "strong_verification": {
        return t("participationStrongVerificationRequired");
      }
    }
  }

  function notifyConversationSettingsUpdated({
    previousMetadata,
    data,
  }: {
    previousMetadata: ExtendedConversation["metadata"] | undefined;
    data: SSEConversationSettingsUpdatedData;
  }): void {
    if (previousMetadata === undefined) {
      return;
    }

    const messages: string[] = [];
    const isClosedChanged = previousMetadata.isClosed !== data.settings.isClosed;

    if (isClosedChanged) {
      messages.push(
        data.settings.isClosed
          ? t("conversationClosed")
          : t("conversationOpened")
      );
    }

    if (previousMetadata.isIndexed !== data.settings.isIndexed) {
      messages.push(
        data.settings.isIndexed
          ? t("conversationPublic")
          : t("conversationPrivate")
      );
    }

    if (previousMetadata.participationMode !== data.settings.participationMode) {
      messages.push(getParticipationModeMessage(data.settings.participationMode));
    }

    if (
      (previousMetadata.requiresEventTicket ?? null) !==
      data.settings.requiresEventTicket
    ) {
      messages.push(
        data.settings.requiresEventTicket === null
          ? t("eventTicketNotRequired")
          : t("eventTicketRequired")
      );
    }

    if (previousMetadata.aiLabelingEnabled !== data.settings.aiLabelingEnabled) {
      messages.push(
        data.settings.aiLabelingEnabled
          ? t("llmTurnedOnByFacilitator")
          : t("llmTurnedOffByFacilitator")
      );
    }

    if (
      previousMetadata.preferredOpinionGroupCount !==
      data.settings.preferredOpinionGroupCount
    ) {
      messages.push(t("facilitatorGroupCountPreferenceChanged"));
    }

    if (messages.length === 0) {
      return;
    }

    const isOnlyClosedChange = messages.length === 1 && isClosedChanged;
    showNotifyMessage({
      message:
        messages.length === 1 ? messages[0] : t("conversationSettingsUpdated"),
      caption: messages.length > 1 ? messages.join(" · ") : undefined,
      icon: isOnlyClosedChange
        ? data.settings.isClosed
          ? "mdi-lock-outline"
          : "mdi-lock-open-outline"
        : "mdi-cog-outline",
      group: `conversation-settings-${data.conversationSlugId}`,
    });
  }

  function handleSSEEvent(sseEvent: AnySSEEvent): void {
    try {
      switch (sseEvent.event) {
        case "connected": {
          const data = sseEvent.data;
          lastHeartbeat.value = data.timestamp;
          break;
        }
        case "notification": {
          const data = sseEvent.data;
          notificationStore.addNewNotification(data.notification);
          break;
        }
        case "new_conversation": {
          void homeFeedStore.hasNewPostCheck("new");
          break;
        }
        case "new_opinion": {
          const data = sseEvent.data;
          opinionUpdatesStore.markNewOpinion(data.conversationSlugId);
          void queryClient.invalidateQueries({
            queryKey: ["comments", data.conversationSlugId],
            refetchType: "none",
          });
          break;
        }
        case "popular_conversation": {
          const data = sseEvent.data;
          homeFeedStore.onPopularConversationUpdate(
            data.topConversationSlugIdList
          );
          break;
        }
        case "conversation_analysis_updated": {
          const data = sseEvent.data;
          const checkpointChanged = data.checkpointChanged === true;
          updateConversationCountsFromAnalysisEvent(data);
          void queryClient.invalidateQueries({
            queryKey: ["conversation", data.conversationSlugId],
            refetchType: "none",
          });
          void queryClient.invalidateQueries({
            predicate: (query) =>
              isLiveAnalysisQueryKey({
                queryKey: query.queryKey,
                conversationSlugId: data.conversationSlugId,
              }) ||
              (checkpointChanged &&
                isCheckpointAnalysisQueryKey({
                  queryKey: query.queryKey,
                  conversationSlugId: data.conversationSlugId,
                  checkpointViewSnapshotId: data.conversationViewSnapshotId,
                })),
          });
          if (checkpointChanged) {
            void queryClient.invalidateQueries({
              queryKey: ["analysisCheckpoints", data.conversationSlugId],
            });
          }
          requestLiveAnalysisCatchUp(data);
          break;
        }
        case "conversation_settings_updated": {
          const data = sseEvent.data;
          const previousTimestamp =
            latestSettingsEventTimestampByConversationSlugId.get(
              data.conversationSlugId
            );
          if (
            previousTimestamp !== undefined &&
            previousTimestamp > data.timestamp
          ) {
            break;
          }

          latestSettingsEventTimestampByConversationSlugId.set(
            data.conversationSlugId,
            data.timestamp
          );

          const previousConversation =
            queryClient.getQueryData<ExtendedConversation>([
              "conversation",
              data.conversationSlugId,
            ]);
          const previousMetadata = previousConversation?.metadata;
          const preferredOpinionGroupCountChanged =
            previousMetadata === undefined ||
            previousMetadata.preferredOpinionGroupCount !==
              data.settings.preferredOpinionGroupCount;
          const aiLabelingEnabledChanged =
            previousMetadata === undefined ||
            previousMetadata.aiLabelingEnabled !==
              data.settings.aiLabelingEnabled;

          updateConversationQueryCache({
            queryClient,
            conversationSlugId: data.conversationSlugId,
            updateConversation: (conversation) => ({
              ...conversation,
              metadata: {
                ...conversation.metadata,
                isIndexed: data.settings.isIndexed,
                participationMode: data.settings.participationMode,
                requiresEventTicket:
                  data.settings.requiresEventTicket ?? undefined,
                aiLabelingEnabled: data.settings.aiLabelingEnabled,
                preferredOpinionGroupCount:
                  data.settings.preferredOpinionGroupCount,
                isClosed: data.settings.isClosed,
              },
            }),
          });

          notifyConversationSettingsUpdated({ previousMetadata, data });

          void queryClient.invalidateQueries({
            predicate: (query) =>
              shouldRefetchLiveAnalysisForSettingsUpdate({
                queryKey: query.queryKey,
                conversationSlugId: data.conversationSlugId,
                preferredOpinionGroupCountChanged,
                aiLabelingEnabledChanged,
                aiLabelingEnabled: data.settings.aiLabelingEnabled,
              }),
          });
          break;
        }
        case "heartbeat": {
          const data = sseEvent.data;
          lastHeartbeat.value = data.timestamp;
          break;
        }
        case "shutdown": {
          break;
        }
      }
    } catch {
      return;
    }
  }

  function updateConversationCountsFromAnalysisEvent(
    data: SSEConversationAnalysisUpdatedData
  ): void {
    const previousTimestamp =
      latestAnalysisEventTimestampByConversationSlugId.get(
        data.conversationSlugId
      );
    if (previousTimestamp !== undefined && previousTimestamp > data.timestamp) {
      return;
    }

    latestAnalysisEventTimestampByConversationSlugId.set(
      data.conversationSlugId,
      data.timestamp
    );

    updateConversationQueryCache({
      queryClient,
      conversationSlugId: data.conversationSlugId,
      updateConversation: (conversation) => {
        const previousSnapshotId =
          conversation.metadata.conversationViewSnapshotId;
        if (
          previousSnapshotId !== undefined &&
          data.conversationViewSnapshotId < previousSnapshotId
        ) {
          return conversation;
        }

        return {
          ...conversation,
          metadata: {
            ...conversation.metadata,
            conversationViewSnapshotId: data.conversationViewSnapshotId,
            opinionCount:
              data.opinionCount ?? conversation.metadata.opinionCount,
            voteCount: data.voteCount ?? conversation.metadata.voteCount,
            participantCount:
              data.participantCount ?? conversation.metadata.participantCount,
            totalOpinionCount:
              data.totalOpinionCount ?? conversation.metadata.totalOpinionCount,
            totalVoteCount:
              data.totalVoteCount ?? conversation.metadata.totalVoteCount,
            totalParticipantCount:
              data.totalParticipantCount ??
              conversation.metadata.totalParticipantCount,
            moderatedOpinionCount:
              data.moderatedOpinionCount ??
              conversation.metadata.moderatedOpinionCount,
            hiddenOpinionCount:
              data.hiddenOpinionCount ??
              conversation.metadata.hiddenOpinionCount,
            isClosed: data.isClosed ?? conversation.metadata.isClosed,
          },
        };
      },
    });
  }

  function getLiveAnalysisCatchUpDelay(attemptIndex: number): number {
    const delay =
      LIVE_ANALYSIS_CATCH_UP_DELAYS_MS[
        Math.min(attemptIndex, LIVE_ANALYSIS_CATCH_UP_DELAYS_MS.length - 1)
      ];
    return delay ?? 2000;
  }

  function getLatestCachedLiveAnalysisSnapshotId({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): number | undefined {
    let latestSnapshotId: number | undefined;
    const queryData = queryClient.getQueriesData<AnalysisData>({
      predicate: (query) =>
        isLiveAnalysisQueryKey({
          queryKey: query.queryKey,
          conversationSlugId,
        }),
    });

    for (const [_queryKey, data] of queryData) {
      const snapshotId = data?.conversationViewSnapshotId;
      if (snapshotId === undefined) {
        continue;
      }
      latestSnapshotId = Math.max(latestSnapshotId ?? 0, snapshotId);
    }

    return latestSnapshotId;
  }

  function hasActiveLiveAnalysisQuery({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): boolean {
    return queryClient
      .getQueryCache()
      .findAll({
        predicate: (query) =>
          isLiveAnalysisQueryKey({
            queryKey: query.queryKey,
            conversationSlugId,
          }),
      })
      .some((query) => query.isActive());
  }

  function clearLiveAnalysisCatchUp({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): void {
    const timeout = liveAnalysisCatchUpTimeoutByConversationSlugId.get(
      conversationSlugId
    );
    if (timeout !== undefined) {
      clearTimeout(timeout);
      liveAnalysisCatchUpTimeoutByConversationSlugId.delete(conversationSlugId);
    }
    latestExpectedLiveSnapshotByConversationSlugId.delete(conversationSlugId);
    liveAnalysisCatchUpGenerationByConversationSlugId.set(
      conversationSlugId,
      (liveAnalysisCatchUpGenerationByConversationSlugId.get(
        conversationSlugId
      ) ?? 0) + 1
    );
  }

  function clearAllLiveAnalysisCatchUps(): void {
    for (const timeout of liveAnalysisCatchUpTimeoutByConversationSlugId.values()) {
      clearTimeout(timeout);
    }
    liveAnalysisCatchUpTimeoutByConversationSlugId.clear();
    latestExpectedLiveSnapshotByConversationSlugId.clear();
    liveAnalysisCatchUpGenerationByConversationSlugId.clear();
  }

  function requestLiveAnalysisCatchUp(
    data: SSEConversationAnalysisUpdatedData
  ): void {
    const previousExpectedSnapshotId =
      latestExpectedLiveSnapshotByConversationSlugId.get(data.conversationSlugId);
    clearLiveAnalysisCatchUp({
      conversationSlugId: data.conversationSlugId,
    });
    latestExpectedLiveSnapshotByConversationSlugId.set(
      data.conversationSlugId,
      Math.max(previousExpectedSnapshotId ?? 0, data.conversationViewSnapshotId)
    );
    const generation =
      (liveAnalysisCatchUpGenerationByConversationSlugId.get(
        data.conversationSlugId
      ) ?? 0) + 1;
    liveAnalysisCatchUpGenerationByConversationSlugId.set(
      data.conversationSlugId,
      generation
    );
    void catchUpLiveAnalysis({
      conversationSlugId: data.conversationSlugId,
      generation,
      attemptIndex: 0,
    });
  }

  async function catchUpLiveAnalysis({
    conversationSlugId,
    generation,
    attemptIndex,
  }: {
    conversationSlugId: string;
    generation: number;
    attemptIndex: number;
  }): Promise<void> {
    if (
      liveAnalysisCatchUpGenerationByConversationSlugId.get(conversationSlugId) !==
      generation
    ) {
      return;
    }

    const expectedSnapshotId =
      latestExpectedLiveSnapshotByConversationSlugId.get(conversationSlugId);
    if (expectedSnapshotId === undefined) {
      return;
    }

    const cachedSnapshotId = getLatestCachedLiveAnalysisSnapshotId({
      conversationSlugId,
    });
    if (
      cachedSnapshotId !== undefined &&
      cachedSnapshotId >= expectedSnapshotId
    ) {
      console.info("[RealtimeSSE] Live analysis caught up", {
        conversationSlugId,
        expectedSnapshotId,
        cachedSnapshotId,
        attemptIndex,
      });
      return;
    }

    if (!hasActiveLiveAnalysisQuery({ conversationSlugId })) {
      console.info("[RealtimeSSE] No active live analysis query to catch up", {
        conversationSlugId,
        expectedSnapshotId,
        cachedSnapshotId,
      });
      return;
    }

    try {
      await queryClient.refetchQueries({
        predicate: (query) =>
          query.isActive() &&
          isLiveAnalysisQueryKey({
            queryKey: query.queryKey,
            conversationSlugId,
          }),
      });
    } catch (error) {
      console.warn("[RealtimeSSE] Live analysis catch-up refetch failed", {
        conversationSlugId,
        expectedSnapshotId,
        cachedSnapshotId,
        attemptIndex,
        error,
      });
    }

    if (
      liveAnalysisCatchUpGenerationByConversationSlugId.get(conversationSlugId) !==
      generation
    ) {
      return;
    }

    const refreshedSnapshotId = getLatestCachedLiveAnalysisSnapshotId({
      conversationSlugId,
    });
    if (
      refreshedSnapshotId !== undefined &&
      refreshedSnapshotId >= expectedSnapshotId
    ) {
      console.info("[RealtimeSSE] Live analysis caught up after refetch", {
        conversationSlugId,
        expectedSnapshotId,
        refreshedSnapshotId,
        attemptIndex,
      });
      return;
    }

    const delay = getLiveAnalysisCatchUpDelay(attemptIndex);
    console.info("[RealtimeSSE] Live analysis still behind; scheduling retry", {
      conversationSlugId,
      expectedSnapshotId,
      refreshedSnapshotId,
      attemptIndex,
      delay,
    });
    const timeout = setTimeout(() => {
      void catchUpLiveAnalysis({
        conversationSlugId,
        generation,
        attemptIndex: attemptIndex + 1,
      });
    }, delay);
    liveAnalysisCatchUpTimeoutByConversationSlugId.set(
      conversationSlugId,
      timeout
    );
  }

  function refreshActiveConversationQueriesAfterReconnect({
    conversationSlugId,
  }: {
    conversationSlugId: string | undefined;
  }): void {
    if (conversationSlugId === undefined) {
      return;
    }

    void queryClient.refetchQueries({
      predicate: (query) =>
        query.isActive() &&
        (isLiveAnalysisQueryKey({
          queryKey: query.queryKey,
          conversationSlugId,
        }) ||
          isAnalysisCheckpointsQueryKey({
            queryKey: query.queryKey,
            conversationSlugId,
          }) ||
          isConversationCommentsQueryKey({
            queryKey: query.queryKey,
            conversationSlugId,
          })),
    });
  }

  function resetHeartbeatWatchdog() {
    if (heartbeatWatchdog) clearTimeout(heartbeatWatchdog);
    heartbeatWatchdog = setTimeout(() => {
      heartbeatWatchdog = null;
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

    // Fixed 1s retry with small jitter (0-250ms) to avoid thundering herd
    const jitter = Math.random() * 250;
    const delay = SSE_RETRY_DELAY_MS + jitter;

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect) {
        void connect();
      }
    }, delay);
  }

  function scheduleOfflineTimer() {
    if (offlineTimer) {
      return;
    }
    // Delay 3 seconds before marking offline (avoids flash on brief disconnects)
    offlineTimer = setTimeout(() => {
      offlineTimer = null;
      setNetworkOffline(true);
    }, 3000);
  }

  function forceReconnect() {
    clearHeartbeatWatchdog();
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

  // Mobile browsers suspend JS timers and kill TCP connections when the page is
  // hidden. On resume, stale timers and reader.read() rejections fire at once,
  // causing false offline detection. The standard pattern (Socket.IO, Pusher):
  // disconnect proactively on hide, reconnect cleanly on show.
  // disconnect() increments connectionId, making any in-flight catch handler
  // stale — it can never schedule an offline timer or touch shared state.
  function onVisibilityChange() {
    if (document.hidden) {
      disconnect();
      shouldReconnect = true;
    } else {
      void connect();
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  watch(
    () => getSubscribedConversationSlugId(),
    (conversationSlugId, previousConversationSlugId) => {
      if (previousConversationSlugId !== undefined) {
        clearLiveAnalysisCatchUp({
          conversationSlugId: previousConversationSlugId,
        });
      }

      if (conversationSlugId === previousConversationSlugId) {
        return;
      }

      if (document.hidden) {
        disconnect();
        shouldReconnect = true;
        return;
      }

      forceReconnect();
    }
  );

  // Watch for authentication state changes — reconnect to switch auth mode.
  // Always connected: authenticated users get personal notifications + global
  // events; anonymous users get only global events.
  watch(
    () => authStore.isGuestOrLoggedIn,
    async (isAuthenticated, wasAuthenticated) => {
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
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearAllLiveAnalysisCatchUps();
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
