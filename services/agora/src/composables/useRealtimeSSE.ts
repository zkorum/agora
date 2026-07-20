import { useQueryClient } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type AnySSEEvent,
  type FetchCommentStatsResponse,
  type FetchProjectPageResponse,
  type SSEContentTranslationUpdatedData,
  type SSEConversationAnalysisUpdatedData,
  type SSEConversationCommentStatsUpdatedData,
  type SSEConversationSettingsUpdatedData,
  zodSSEEventDataByType,
} from "src/shared/types/dto";
import type {
  ExtendedConversation,
  OpinionItem,
  ParticipationMode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useLanguageStore } from "src/stores/language";
import { useNotificationStore } from "src/stores/notification";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { fetchAnalysisDataWithCache } from "src/utils/api/comment/useCommentQueries";
import { useCommonApi } from "src/utils/api/common";
import {
  type ProjectContentFetchResponse,
  useBackendContentTranslationApi,
} from "src/utils/api/contentTranslation/contentTranslation";
import {
  getConversationContentQueryPrefix,
  getConversationDisplayContentQueryPrefix,
  getProjectContentQueryKey,
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { processEnv } from "src/utils/processEnv";
import { abortIgnoringAbortError } from "src/utils/sse/abort";
import {
  type ParsedSSEFrame,
  parseRawSSEFrame,
  splitCompleteSSEFrames,
} from "src/utils/sse/frameParser";
import {
  publishContentTranslationFailed,
  publishContentTranslationUpdated,
} from "src/utils/translation/contentTranslationEvents";
import { useNotify } from "src/utils/ui/notify";
import { type MaybeRefOrGetter, onUnmounted, ref, toValue, watch } from "vue";

import {
  createLiveAnalysisCatchUpController,
  isAnalysisQueryKeyForConversation,
  isLiveAnalysisQueryKey,
} from "./useLiveAnalysisCatchUp";
import { setNetworkOffline } from "./useNetworkStatus";
import {
  type RealtimeSSETranslations,
  realtimeSSETranslations,
} from "./useRealtimeSSE.i18n";

const SSE_CONNECTION_TIMEOUT_MS = 15_000;
const SSE_DEFAULT_RETRY_DELAY_MS = 1_000;
const SSE_MAX_BUFFER_LENGTH = 1_000_000;
const SSE_PROCESSED_ID_CACHE_SIZE = 1_000;
// @fastify/sse sends comment heartbeats every 30s by default.
// When the API stops ungracefully, reader.read() can hang indefinitely on a dead
// TCP connection. This watchdog aborts the connection after 45s of silence (1.5x
// the server interval), triggering the normal reconnect + offline detection flow.
// 1.5x is comparable to Socket.IO (~1.8x); RabbitMQ uses 2.0x for reference.
// References:
// - Socket.IO heartbeat: https://socket.io/docs/v4/how-it-works/
// - RabbitMQ heartbeat: https://www.rabbitmq.com/docs/heartbeats
// - Python websockets keepalive: https://websockets.readthedocs.io/en/stable/topics/keepalive.html
const SSE_HEARTBEAT_TIMEOUT_MS = 45_000;
const realtimeSSEHotDisposeHandlers = new Set<() => void>();

interface ParsedRealtimeSSEEvent {
  event: AnySSEEvent;
  id: string | null;
}

type ProjectContentTranslationUpdatedData = Omit<
  SSEContentTranslationUpdatedData,
  "subject"
> & {
  subject: Extract<
    SSEContentTranslationUpdatedData["subject"],
    { kind: "project" }
  >;
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const dispose of realtimeSSEHotDisposeHandlers) {
      dispose();
    }
    realtimeSSEHotDisposeHandlers.clear();
  });
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

function isAnalysisFrameManifestQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    queryKey[0] === "analysisFrameManifest" &&
    queryKey[1] === conversationSlugId
  );
}

function isAnalysisFrameSectionQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    (queryKey[0] === "analysisFrameGroups" ||
      queryKey[0] === "analysisFrameGroupLabels" ||
      queryKey[0] === "analysisFrameOpinionList") &&
    queryKey[1] === conversationSlugId
  );
}

function isAnalysisFrameGroupLabelsQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return (
    queryKey[0] === "analysisFrameGroupLabels" &&
    queryKey[1] === conversationSlugId
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

function isCommentStatsQueryKey({
  queryKey,
  conversationSlugId,
}: {
  queryKey: readonly unknown[];
  conversationSlugId: string;
}): boolean {
  return queryKey[0] === "commentStats" && queryKey[1] === conversationSlugId;
}

/**
 * Single composable for ALL real-time server events.
 * Maintains an SSE connection after auth initialization when:
 * - Authenticated (guest/logged-in): connects with UCAN headers → receives
 *   personal notifications + global events (new_conversation)
 * - Anonymous: connects without auth → receives public global events and
 *   subscribed conversation events when applicable
 * On auth state change: disconnects from old mode → reconnects with new headers.
 */
export function useRealtimeSSE({
  subscribedConversationSlugId,
  subscribedTopics,
}: {
  subscribedConversationSlugId?: MaybeRefOrGetter<string | undefined>;
  subscribedTopics?: MaybeRefOrGetter<readonly string[] | undefined>;
} = {}) {
  const { buildEncodedUcan } = useCommonApi();
  const notificationStore = useNotificationStore();
  const homeFeedStore = useHomeFeedStore();
  const opinionUpdatesStore = useOpinionUpdatesStore();
  const authStore = useAuthenticationStore();
  const languageStore = useLanguageStore();
  const queryClient = useQueryClient();
  const {
    fetchAnalysisFrameManifest,
    fetchAnalysisFrameGroups,
    fetchAnalysisFrameGroupLabels,
    fetchAnalysisFrameOpinionList,
  } = useBackendCommentApi();
  const liveAnalysisCatchUpController = createLiveAnalysisCatchUpController({
    queryClient,
    fetchLiveAnalysis: (params) =>
      fetchAnalysisDataWithCache({
        queryClient,
        fetchAnalysisFrameManifest,
        fetchAnalysisFrameGroups,
        fetchAnalysisFrameGroupLabels,
        fetchAnalysisFrameOpinionList,
        conversationSlugId: params.conversationSlugId,
        analysisView: params.analysisView,
        checkpointViewSnapshotId: params.checkpointViewSnapshotId,
        aiLabelingEnabled: params.aiLabelingEnabled,
        displayLanguage: params.displayLanguage,
        spokenLanguages: params.spokenLanguages,
        voteCount: undefined,
        freshness: params.freshness,
        analysisQueryKey: undefined,
      }),
  });
  const { refreshAuthState } = useBackendAuthApi();
  const { fetchProjectContent } = useBackendContentTranslationApi();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<RealtimeSSETranslations>(
    realtimeSSETranslations
  );

  const isConnected = ref(false);
  const isConnecting = ref(false);
  let abortController: AbortController | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let shouldReconnect = true;
  let connectionId = 0;
  let lastEventId: string | null = null;
  let reconnectDelayMs = SSE_DEFAULT_RETRY_DELAY_MS;
  let offlineTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;
  const processedSSEEventIds = new Set<string>();
  const processedSSEEventIdOrder: string[] = [];
  const latestAnalysisEventTimestampByConversationSlugId = new Map<
    string,
    number
  >();
  const latestSettingsEventTimestampByConversationSlugId = new Map<
    string,
    number
  >();
  const latestCommentStatsEventTimestampByConversationSlugId = new Map<
    string,
    number
  >();
  let didCleanup = false;

  function getSubscribedConversationSlugId(): string | undefined {
    return toValue(subscribedConversationSlugId);
  }

  function getSubscribedTopics(): readonly string[] {
    return toValue(subscribedTopics) ?? [];
  }

  function getSubscribedTopicSignature(): string {
    return getSubscribedTopics().join("\n");
  }

  function shouldMaintainConnection(): boolean {
    return !didCleanup && !document.hidden && authStore.isAuthInitialized;
  }

  function disconnectAndAllowLaterReconnect(): void {
    disconnect();
    shouldReconnect = true;
  }

  function buildRealtimeStreamUrl(): string {
    const baseUrl = processEnv.VITE_API_BASE_URL || "";
    const path = "/api/v1/realtime/stream";
    const conversationSlugId = getSubscribedConversationSlugId();
    const params = new URLSearchParams();
    if (conversationSlugId !== undefined) {
      params.set("conversationSlugId", conversationSlugId);
    }
    for (const topic of getSubscribedTopics()) {
      params.append("topic", topic);
    }
    if (params.size === 0) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}${path}?${params.toString()}`;
  }

  async function connect() {
    if (!shouldMaintainConnection()) {
      return;
    }

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
        if (abortController !== null) {
          abortIgnoringAbortError(abortController);
        }
      }, SSE_CONNECTION_TIMEOUT_MS);

      const url = buildRealtimeStreamUrl();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };
      if (lastEventId !== null) {
        headers["Last-Event-ID"] = lastEventId;
      }

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
          const didRefreshAuthState =
            await refreshAuthStateAfterSSEUnauthorized();
          if (didRefreshAuthState) {
            isConnecting.value = false;
            isConnected.value = false;
            setNetworkOffline(false);
            if (
              thisConnectionId === connectionId &&
              shouldReconnect &&
              shouldMaintainConnection()
            ) {
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
        if (buffer.length > SSE_MAX_BUFFER_LENGTH) {
          throw new Error("SSE event buffer exceeded maximum size");
        }

        const { frames, remainingBuffer } = splitCompleteSSEFrames(buffer);
        buffer = remainingBuffer;

        for (const part of frames) {
          if (!part.trim()) continue;
          const parsed = parseSSEEvent(part);
          if (parsed !== undefined) {
            handleParsedSSEEvent(parsed);
          }
        }
      }

      // Stream ended normally — check staleness before touching shared state
      clearHeartbeatWatchdog();
      if (thisConnectionId !== connectionId) return;

      isConnected.value = false;
      scheduleOfflineTimer();
      if (shouldReconnect && shouldMaintainConnection()) {
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

      if (shouldReconnect && shouldMaintainConnection()) {
        scheduleReconnect();
      }
    }
  }

  function updateLastEventId(id: string): void {
    if (id === "") {
      lastEventId = null;
      return;
    }

    const numericId = Number(id);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      const numericLastEventId =
        lastEventId === null ? null : Number(lastEventId);
      if (
        numericLastEventId === null ||
        !Number.isSafeInteger(numericLastEventId) ||
        numericId > numericLastEventId
      ) {
        lastEventId = id;
      }
      return;
    }

    lastEventId = id;
  }

  function rememberProcessedSSEEventId(id: string): void {
    if (processedSSEEventIds.has(id)) {
      return;
    }

    processedSSEEventIds.add(id);
    processedSSEEventIdOrder.push(id);
    while (processedSSEEventIdOrder.length > SSE_PROCESSED_ID_CACHE_SIZE) {
      const expiredId = processedSSEEventIdOrder.shift();
      if (expiredId !== undefined) {
        processedSSEEventIds.delete(expiredId);
      }
    }
  }

  function handleParsedSSEEvent(parsed: ParsedRealtimeSSEEvent): void {
    if (parsed.id !== null && parsed.id !== "") {
      if (processedSSEEventIds.has(parsed.id)) {
        return;
      }
      rememberProcessedSSEEventId(parsed.id);
    }

    handleSSEEvent(parsed.event);
  }

  function parseSSEEvent(raw: string): ParsedRealtimeSSEEvent | undefined {
    const frame = parseRawSSEFrame(raw);
    if (frame.kind === "comment") {
      return undefined;
    }

    if (frame.id !== null) {
      updateLastEventId(frame.id);
    }
    if (frame.retry !== null) {
      reconnectDelayMs = frame.retry;
    }

    const data = frame.data.trim();
    if (data === "") {
      return undefined;
    }

    let rawData: unknown;

    try {
      rawData = JSON.parse(data);
    } catch (error) {
      logSSEJSONParseError({ raw, frame, data, error });
      return undefined;
    }

    switch (frame.event) {
      case "connected": {
        const result = zodSSEEventDataByType.connected.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "notification": {
        const result = zodSSEEventDataByType.notification.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "new_conversation": {
        const result =
          zodSSEEventDataByType.new_conversation.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "new_opinion": {
        const result = zodSSEEventDataByType.new_opinion.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "popular_conversation": {
        const result =
          zodSSEEventDataByType.popular_conversation.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "conversation_analysis_updated": {
        const result =
          zodSSEEventDataByType.conversation_analysis_updated.safeParse(
            rawData
          );
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "conversation_comment_stats_updated": {
        const result =
          zodSSEEventDataByType.conversation_comment_stats_updated.safeParse(
            rawData
          );
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "conversation_settings_updated": {
        const result =
          zodSSEEventDataByType.conversation_settings_updated.safeParse(
            rawData
          );
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "content_translation_updated": {
        const result =
          zodSSEEventDataByType.content_translation_updated.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "subscription_ready": {
        const result =
          zodSSEEventDataByType.subscription_ready.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      case "shutdown": {
        const result = zodSSEEventDataByType.shutdown.safeParse(rawData);
        if (!result.success) {
          logInvalidSSEPayload({ event: frame.event, error: result.error });
          return undefined;
        }
        return {
          id: frame.id,
          event: { event: frame.event, data: result.data },
        };
      }
      default:
        console.error(`Unknown SSE event: ${frame.event}`);
        return undefined;
    }
  }

  function logSSEJSONParseError({
    raw,
    frame,
    data,
    error,
  }: {
    raw: string;
    frame: Extract<ParsedSSEFrame, { kind: "event" }>;
    data: string;
    error: unknown;
  }): void {
    if (import.meta.env.DEV) {
      void logDevSSEJSONParseError({ raw, frame, data, error });
    }

    console.error("Failed to parse SSE event JSON", error);
  }

  async function logDevSSEJSONParseError({
    raw,
    frame,
    data,
    error,
  }: {
    raw: string;
    frame: Extract<ParsedSSEFrame, { kind: "event" }>;
    data: string;
    error: unknown;
  }): Promise<void> {
    const { logBrowserEvent } = await import("src/utils/devLogger");
    logBrowserEvent({
      level: "error",
      category: "sse_parse_error",
      message: "failed_to_parse_sse_event_json",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: {
        event: frame.event === "" ? null : frame.event,
        dataLength: data.length,
        frameLength: raw.length,
        dataPreview: data,
        framePreview: raw,
      },
    });
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
    const isClosedChanged =
      previousMetadata.isClosed !== data.settings.isClosed;

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

    if (
      previousMetadata.participationMode !== data.settings.participationMode
    ) {
      messages.push(
        getParticipationModeMessage(data.settings.participationMode)
      );
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

    if (
      previousMetadata.aiLabelingEnabled !== data.settings.aiLabelingEnabled
    ) {
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

  function shouldHandleAnalysisUpdatedEventForDisplayLanguage(
    data: SSEConversationAnalysisUpdatedData
  ): boolean {
    if (data.changeKind !== "descriptions") {
      return true;
    }

    const locales = data.locales;
    if (locales.includes("en")) {
      return true;
    }

    return locales.includes(languageStore.displayLanguage);
  }

  function handleSSEEvent(sseEvent: AnySSEEvent): void {
    try {
      switch (sseEvent.event) {
        case "connected": {
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
          void queryClient.invalidateQueries({
            queryKey: ["hiddenComments", data.conversationSlugId],
            refetchType: "none",
          });
          void queryClient.invalidateQueries({
            queryKey: ["commentStats", data.conversationSlugId],
            refetchType: "active",
          });
          break;
        }
        case "conversation_comment_stats_updated": {
          updateCommentStatsFromEvent(sseEvent.data);
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
          if (!shouldHandleAnalysisUpdatedEventForDisplayLanguage(data)) {
            break;
          }

          const checkpointChanged = data.checkpointChanged === true;
          updateConversationCountsFromAnalysisEvent(data);
          void queryClient.invalidateQueries({
            queryKey: ["conversation", data.conversationSlugId],
            refetchType: "none",
          });
          void queryClient.invalidateQueries({
            queryKey: ["survey-results-aggregated", data.conversationSlugId],
            refetchType: "active",
          });
          void queryClient.invalidateQueries({
            predicate: (query) =>
              isLiveAnalysisQueryKey({
                queryKey: query.queryKey,
                conversationSlugId: data.conversationSlugId,
              }),
            refetchType: "none",
          });
          if (data.changeKind !== "descriptions") {
            void queryClient.invalidateQueries({
              predicate: (query) =>
                isAnalysisFrameManifestQueryKey({
                  queryKey: query.queryKey,
                  conversationSlugId: data.conversationSlugId,
                }),
              refetchType: "none",
            });
          }
          void queryClient.invalidateQueries({
            predicate: (query) =>
              data.changeKind === "descriptions"
                ? isAnalysisFrameGroupLabelsQueryKey({
                    queryKey: query.queryKey,
                    conversationSlugId: data.conversationSlugId,
                  })
                : isAnalysisFrameSectionQueryKey({
                    queryKey: query.queryKey,
                    conversationSlugId: data.conversationSlugId,
                  }),
            refetchType: "none",
          });
          if (data.changeKind === "descriptions") {
            void queryClient.refetchQueries({
              predicate: (query) =>
                query.isActive() &&
                isAnalysisFrameGroupLabelsQueryKey({
                  queryKey: query.queryKey,
                  conversationSlugId: data.conversationSlugId,
                }),
            });
          }
          if (checkpointChanged || data.changeKind === "descriptions") {
            void queryClient.invalidateQueries({
              predicate: (query) =>
                isCheckpointAnalysisQueryKey({
                  queryKey: query.queryKey,
                  conversationSlugId: data.conversationSlugId,
                  checkpointViewSnapshotId: data.conversationViewSnapshotId,
                }),
              refetchType: "active",
            });
          }
          if (checkpointChanged) {
            void queryClient.invalidateQueries({
              queryKey: ["analysisCheckpoints", data.conversationSlugId],
            });
          }
          liveAnalysisCatchUpController.requestCatchUp(data);
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

          if (preferredOpinionGroupCountChanged || aiLabelingEnabledChanged) {
            void queryClient.invalidateQueries({
              queryKey: ["analysisFrameManifest", data.conversationSlugId],
              refetchType: "none",
            });
          }

          if (aiLabelingEnabledChanged) {
            void queryClient.invalidateQueries({
              queryKey: ["analysisFrameGroupLabels", data.conversationSlugId],
              refetchType: "none",
            });
          }

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
        case "content_translation_updated": {
          void handleContentTranslationUpdated(sseEvent.data);
          break;
        }
        case "subscription_ready": {
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

  async function handleContentTranslationUpdated(
    data: SSEContentTranslationUpdatedData
  ): Promise<void> {
    if (isProjectContentTranslationUpdatedData(data)) {
      await updateProjectPageContentTranslation(data);
      if (data.status === "failed") {
        publishContentTranslationFailed(data);
      }
      return;
    }

    if (data.status === "failed") {
      publishContentTranslationFailed(data);
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: ["contentTranslation", data.subject, data.targetLanguageCode],
      refetchType: "active",
    });
    if (data.subject.kind === "conversation") {
      void queryClient.invalidateQueries({
        queryKey: ["conversation", data.subject.conversationSlugId],
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: getConversationContentQueryPrefix({
          conversationSlugId: data.subject.conversationSlugId,
        }),
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: getConversationDisplayContentQueryPrefix({
          conversationSlugId: data.subject.conversationSlugId,
        }),
        refetchType: "active",
      });
      publishContentTranslationUpdated(data);
      return;
    }
    if (data.subject.kind === "survey_question") {
      void queryClient.invalidateQueries({
        queryKey: ["survey-form", data.subject.conversationSlugId],
        refetchType: "active",
      });
      publishContentTranslationUpdated(data);
      return;
    }
    if (data.subject.kind === "ranking_item") {
      void queryClient.invalidateQueries({
        queryKey: ["maxdiff-items", data.subject.conversationSlugId],
        refetchType: "active",
      });
    }
    publishContentTranslationUpdated(data);
  }

  async function updateProjectPageContentTranslation(
    data: ProjectContentTranslationUpdatedData
  ): Promise<void> {
    if (data.status === "failed") {
      updateProjectPageDisplayContentStatus({ data, status: "failed" });
      return;
    }

    let response: ProjectContentFetchResponse;
    try {
      response = await fetchProjectContent({
        projectSlug: data.subject.projectSlug,
        sourceVersion: data.subject.sourceVersion,
        mode: "translated",
        requestMode: "read_existing",
      });
    } catch (error) {
      console.warn(
        "Failed to fetch project translation after SSE update",
        error
      );
      return;
    }

    if (response.status !== "available") {
      updateProjectPageDisplayContentStatus({ data, status: response.status });
      return;
    }

    queryClient.setQueryData<ProjectContentFetchResponse>(
      getProjectContentQueryKey({
        projectSlug: data.subject.projectSlug,
        sourceVersion: data.subject.sourceVersion,
        mode: "translated",
        targetLanguageCode: data.targetLanguageCode,
        spokenLanguages: languageStore.spokenLanguages,
      }),
      response
    );

    queryClient.setQueriesData<FetchProjectPageResponse>(
      {
        predicate: (query) =>
          isProjectPageQueryForTranslation({ queryKey: query.queryKey, data }),
      },
      (previousData) => {
        if (previousData === undefined) {
          return previousData;
        }
        return {
          ...previousData,
          project: {
            ...previousData.project,
            displayContent: response,
          },
        };
      }
    );
  }

  function updateProjectPageDisplayContentStatus({
    data,
    status,
  }: {
    data: ProjectContentTranslationUpdatedData;
    status: Exclude<ProjectContentFetchResponse["status"], "available">;
  }): void {
    queryClient.setQueriesData<FetchProjectPageResponse>(
      {
        predicate: (query) =>
          isProjectPageQueryForTranslation({ queryKey: query.queryKey, data }),
      },
      (previousData) => {
        const displayContent = previousData?.project.displayContent;
        if (previousData === undefined || displayContent === undefined) {
          return previousData;
        }
        const translationControl = displayContent.translationControl;
        if (
          translationControl === null ||
          displayContent.sourceVersion !== data.subject.sourceVersion
        ) {
          return previousData;
        }
        const nextTranslationControl = {
          ...translationControl,
          status,
        };

        return displayContent.status === "available"
          ? {
              ...previousData,
              project: {
                ...previousData.project,
                displayContent: {
                  ...displayContent,
                  translationControl: nextTranslationControl,
                },
              },
            }
          : {
              ...previousData,
              project: {
                ...previousData.project,
                displayContent: {
                  ...displayContent,
                  status,
                  translationControl: nextTranslationControl,
                },
              },
            };
      }
    );
  }

  function isProjectPageQueryForTranslation({
    queryKey,
    data,
  }: {
    queryKey: readonly unknown[];
    data: ProjectContentTranslationUpdatedData;
  }): boolean {
    return (
      queryKey[0] === "projectPage" &&
      queryKey[1] === data.subject.projectSlug &&
      queryKey[2] === data.targetLanguageCode
    );
  }

  function isProjectContentTranslationUpdatedData(
    data: SSEContentTranslationUpdatedData
  ): data is ProjectContentTranslationUpdatedData {
    return data.subject.kind === "project";
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
          },
        };
      },
    });
  }

  function updateCommentStatsFromEvent(
    data: SSEConversationCommentStatsUpdatedData
  ): void {
    const previousTimestamp =
      latestCommentStatsEventTimestampByConversationSlugId.get(
        data.conversationSlugId
      );
    if (previousTimestamp !== undefined && previousTimestamp > data.timestamp) {
      return;
    }

    latestCommentStatsEventTimestampByConversationSlugId.set(
      data.conversationSlugId,
      data.timestamp
    );

    const stats: FetchCommentStatsResponse = {
      conversationViewSnapshotId: data.conversationViewSnapshotId,
      opinionCount: data.opinionCount,
      voteCount: data.voteCount,
      participantCount: data.participantCount,
      totalOpinionCount: data.totalOpinionCount,
      totalVoteCount: data.totalVoteCount,
      totalParticipantCount: data.totalParticipantCount,
      moderatedOpinionCount: data.moderatedOpinionCount,
      hiddenOpinionCount: data.hiddenOpinionCount,
      isClosed: data.isClosed,
    };

    queryClient.setQueriesData<FetchCommentStatsResponse>(
      { queryKey: ["commentStats", data.conversationSlugId] },
      stats
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
            opinionCount: data.opinionCount,
            voteCount: data.voteCount,
            participantCount: data.participantCount,
            totalOpinionCount: data.totalOpinionCount,
            totalVoteCount: data.totalVoteCount,
            totalParticipantCount: data.totalParticipantCount,
            moderatedOpinionCount: data.moderatedOpinionCount,
            hiddenOpinionCount: data.hiddenOpinionCount,
            isClosed: data.isClosed,
          },
        };
      },
    });

    updateVotedVisibleOpinionCountsFromEvent(data);
  }

  function updateVotedVisibleOpinionCountsFromEvent(
    data: SSEConversationCommentStatsUpdatedData
  ): void {
    if (data.opinionVoteCounts.length === 0) {
      return;
    }

    const userVotes =
      queryClient.getQueryData<Array<{ opinionSlugId: string }>>([
        "userVotes",
        data.conversationSlugId,
      ]) ?? [];
    const votedOpinionSlugIds = new Set(
      userVotes.map((vote) => vote.opinionSlugId)
    );
    if (votedOpinionSlugIds.size === 0) {
      return;
    }

    const liveCountsByOpinionSlugId = new Map(
      data.opinionVoteCounts
        .filter((counts) => votedOpinionSlugIds.has(counts.opinionSlugId))
        .map((counts) => [counts.opinionSlugId, counts])
    );
    if (liveCountsByOpinionSlugId.size === 0) {
      return;
    }

    queryClient.setQueriesData<OpinionItem[]>(
      {
        predicate: (query) =>
          isConversationCommentsQueryKey({
            queryKey: query.queryKey,
            conversationSlugId: data.conversationSlugId,
          }),
      },
      (opinions) => {
        if (opinions === undefined) {
          return opinions;
        }

        return opinions.map((opinion) => {
          const liveCounts = liveCountsByOpinionSlugId.get(
            opinion.opinionSlugId
          );
          if (liveCounts === undefined) {
            return opinion;
          }

          return {
            ...opinion,
            numParticipants: liveCounts.numParticipants,
            numAgrees: liveCounts.numAgrees,
            numDisagrees: liveCounts.numDisagrees,
            numPasses: liveCounts.numPasses,
          };
        });
      }
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
        (isAnalysisCheckpointsQueryKey({
          queryKey: query.queryKey,
          conversationSlugId,
        }) ||
          isCommentStatsQueryKey({
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
        abortIgnoringAbortError(abortController);
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
    if (!shouldMaintainConnection()) {
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    // Fixed 1s retry with small jitter (0-250ms) to avoid thundering herd
    const jitter = Math.random() * 250;
    const delay = reconnectDelayMs + jitter;

    reconnectTimeout = setTimeout(() => {
      if (shouldReconnect && shouldMaintainConnection()) {
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
    disconnectAndAllowLaterReconnect();

    if (shouldMaintainConnection()) {
      void connect();
    }
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
      abortIgnoringAbortError(abortController);
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
      disconnectAndAllowLaterReconnect();
    } else {
      if (shouldMaintainConnection()) {
        void connect();
      }
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  function cleanupRealtimeSSE(): void {
    if (didCleanup) {
      return;
    }
    didCleanup = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    liveAnalysisCatchUpController.clearAll();
    disconnect();
    realtimeSSEHotDisposeHandlers.delete(cleanupRealtimeSSE);
  }

  if (import.meta.env.DEV) {
    realtimeSSEHotDisposeHandlers.add(cleanupRealtimeSSE);
  }

  watch(
    () => getSubscribedConversationSlugId(),
    (conversationSlugId, previousConversationSlugId) => {
      if (previousConversationSlugId !== undefined) {
        liveAnalysisCatchUpController.clearConversation({
          conversationSlugId: previousConversationSlugId,
        });
      }

      if (conversationSlugId === previousConversationSlugId) {
        return;
      }

      if (document.hidden) {
        disconnectAndAllowLaterReconnect();
        return;
      }

      if (shouldMaintainConnection()) {
        forceReconnect();
      } else {
        disconnectAndAllowLaterReconnect();
      }
    }
  );

  watch(
    () => getSubscribedTopicSignature(),
    (topicSignature, previousTopicSignature) => {
      if (topicSignature === previousTopicSignature) {
        return;
      }

      if (document.hidden) {
        disconnectAndAllowLaterReconnect();
        return;
      }

      if (shouldMaintainConnection()) {
        forceReconnect();
      } else {
        disconnectAndAllowLaterReconnect();
      }
    }
  );

  // Watch for authentication state changes — reconnect to switch auth mode.
  // Wait for auth initialization first so check-login-status is never queued
  // behind long-lived SSE connections.
  watch(
    () => [authStore.isAuthInitialized, authStore.isGuestOrLoggedIn] as const,
    async ([isAuthInitialized, isAuthenticated], previousState) => {
      const wasAuthInitialized = previousState?.[0];
      const wasAuthenticated = previousState?.[1];
      if (!isAuthInitialized) {
        disconnectAndAllowLaterReconnect();
        return;
      }

      if (
        isAuthInitialized !== wasAuthInitialized ||
        isAuthenticated !== wasAuthenticated
      ) {
        disconnectAndAllowLaterReconnect();
        if (shouldMaintainConnection()) {
          await connect();
        }
      }
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupRealtimeSSE();
  });

  return {
    connect,
    disconnect,
    forceReconnect,
    isConnected,
    isConnecting,
  };
}
