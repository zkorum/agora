import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  CONVERSATION_EMAIL_UPDATE_PREFERENCE_SEARCH_MAX_LENGTH,
  type ConversationEmailUpdatePreferenceFocus,
  type ConversationEmailUpdatePreferenceGroup,
} from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useRemoveConversationEmailUpdateSummaryQueries } from "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, watch } from "vue";

import {
  applyPreferenceOverrides,
  CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE,
  getAutoExpandedPreferenceGroupKeys,
  getPreferenceGroupKey,
  getPreferenceOverrideKey,
  getPreferenceOverridesFromResult,
  setPreferenceOverrides,
} from "./conversationUpdatePreferenceLogic";
import {
  type ConversationUpdatePreferenceSettingsTranslations,
  conversationUpdatePreferenceSettingsTranslations,
} from "./ConversationUpdatePreferenceSettings.i18n";
import type {
  ConversationEmailUpdatePreferenceChange,
  ConversationEmailUpdatePreferenceOverride,
  ConversationEmailUpdatePreferenceResult,
  ProjectEmailUpdatePreferenceGroup,
} from "./conversationUpdatePreferenceTypes";
import {
  type EmailUpdateResumeNotificationTranslations,
  emailUpdateResumeNotificationTranslations,
} from "./emailUpdateResumeNotification.i18n";

export function useConversationUpdatePreferences({
  initialFocus,
  initialSearch,
}: {
  initialFocus: () => ConversationEmailUpdatePreferenceFocus | undefined;
  initialSearch: () => string | undefined;
}) {
  const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
  const removeConversationEmailUpdateSummaryQueries =
    useRemoveConversationEmailUpdateSummaryQueries();
  const { t } =
    useComponentI18n<ConversationUpdatePreferenceSettingsTranslations>(
      conversationUpdatePreferenceSettingsTranslations
    );
  const { t: tEmailUpdateResume } =
    useComponentI18n<EmailUpdateResumeNotificationTranslations>(
      emailUpdateResumeNotificationTranslations
    );
  const { showNotifyMessage } = useNotify();

  const initialFocusValue = initialFocus();
  const search = ref(
    normalizeSearch(
      initialFocusValue === undefined ? initialSearch() : undefined
    )
  );
  const focus = ref(initialFocusValue);
  const serverGroups = ref<readonly ConversationEmailUpdatePreferenceGroup[]>(
    []
  );
  const serverGlobalPaused = ref(false);
  const confirmedOverrides = ref<
    ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride>
  >(new Map());
  const pendingOverrides = ref<
    ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride>
  >(new Map());
  const expandedGroupKeys = ref<ReadonlySet<string>>(new Set());
  const nextCursor = ref<string | undefined>(undefined);
  const isInitialLoading = ref(true);
  const isRefreshing = ref(false);
  const isLoadingMore = ref(false);
  const loadError = ref<string | undefined>(undefined);
  const paginationError = ref<string | undefined>(undefined);
  const conversationPaginationErrors = ref<ReadonlyMap<string, string>>(
    new Map()
  );
  const loadingConversationGroupKeys = ref<ReadonlySet<string>>(new Set());
  let queryRequestId = 0;
  let hasLoadedPreferences = false;
  let lastLoadedQueryKey: string | undefined;
  let nextMutationRevision = 0;
  let reloadAfterMutations = false;
  let requiresAuthoritativeReload = false;
  const latestMutationRevisionByKey = new Map<string, number>();
  const conversationPageRequestTokenByGroup = new Map<string, object>();

  const effectiveOverrides = computed(() =>
    setPreferenceOverrides({
      overrides: confirmedOverrides.value,
      preferences: [...pendingOverrides.value.values()],
    })
  );
  const preferenceState = computed(() =>
    applyPreferenceOverrides({
      globalPaused: serverGlobalPaused.value,
      groups: serverGroups.value,
      overrides: effectiveOverrides.value,
    })
  );
  const groups = computed(() => preferenceState.value.groups);
  const globalEnabled = computed(() => !preferenceState.value.globalPaused);
  const isPreferenceSaving = computed(
    () => pendingOverrides.value.size > 0
  );

  watch([initialSearch, initialFocus], ([searchValue, focusValue]) => {
    focus.value = focusValue;
    search.value = normalizeSearch(
      focusValue === undefined ? searchValue : undefined
    );
    void loadFirstPage();
  });

  async function loadFirstPage(): Promise<void> {
    const requestId = ++queryRequestId;
    const mutationRevision = nextMutationRevision;
    const protectedOverrideKeys = new Set(pendingOverrides.value.keys());
    if (protectedOverrideKeys.size > 0) {
      protectedOverrideKeys.add("global");
    }
    isLoadingMore.value = false;
    paginationError.value = undefined;
    conversationPaginationErrors.value = new Map();
    loadingConversationGroupKeys.value = new Set();
    conversationPageRequestTokenByGroup.clear();
    isInitialLoading.value = !hasLoadedPreferences;
    isRefreshing.value = hasLoadedPreferences;
    loadError.value = undefined;
    try {
      const trimmedSearch = search.value.trim();
      const requestedFocus = focus.value;
      const queryKey = getPreferenceQueryKey({
        focus: requestedFocus,
        search: trimmedSearch,
      });
      const response = await emailUpdatesApi.getPreferences(
        requestedFocus === undefined
          ? {
              mode: "browse",
              search: trimmedSearch === "" ? undefined : trimmedSearch,
              limit: CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE,
            }
          : {
              mode: "focus",
              focus: requestedFocus,
            }
      );
      if (requestId !== queryRequestId) {
        return;
      }
      if (!response.success) {
        handlePreferenceLoadError({
          message: getPreferencesError(response.reason),
          queryKey,
        });
        return;
      }
      hasLoadedPreferences = true;
      lastLoadedQueryKey = queryKey;
      requiresAuthoritativeReload = false;
      serverGlobalPaused.value = response.globalPaused;
      serverGroups.value = response.groups;
      confirmedOverrides.value = new Map(
        [...confirmedOverrides.value].filter(
          ([key]) =>
            protectedOverrideKeys.has(key) ||
            (latestMutationRevisionByKey.get(key) ?? 0) > mutationRevision
        )
      );
      expandedGroupKeys.value = getAutoExpandedPreferenceGroupKeys({
        groups: response.groups,
        expandAll: trimmedSearch !== "",
      });
      nextCursor.value = response.nextCursor;
    } catch (error) {
      console.error("Failed to load Email Update preferences", error);
      if (requestId === queryRequestId) {
        handlePreferenceLoadError({
          message: t("preferencesUnavailable"),
          queryKey: getPreferenceQueryKey({
            focus: focus.value,
            search: search.value.trim(),
          }),
        });
      }
    } finally {
      if (requestId === queryRequestId) {
        isInitialLoading.value = false;
        isRefreshing.value = false;
      }
    }
  }

  async function loadMore(): Promise<void> {
    const cursor = nextCursor.value;
    if (
      cursor === undefined ||
      isLoadingMore.value ||
      isRefreshing.value ||
      focus.value !== undefined
    ) {
      return;
    }
    const requestId = queryRequestId;
    isLoadingMore.value = true;
    paginationError.value = undefined;
    try {
      const trimmedSearch = search.value.trim();
      const response = await emailUpdatesApi.getPreferences({
        mode: "browse",
        search: trimmedSearch === "" ? undefined : trimmedSearch,
        cursor,
        limit: CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE,
      });
      if (requestId !== queryRequestId) {
        return;
      }
      if (!response.success) {
        paginationError.value = getPreferencesError(response.reason);
        return;
      }
      serverGlobalPaused.value = response.globalPaused;
      serverGroups.value = [...serverGroups.value, ...response.groups];
      expandedGroupKeys.value = new Set([
        ...expandedGroupKeys.value,
        ...getAutoExpandedPreferenceGroupKeys({
          groups: response.groups,
          expandAll: trimmedSearch !== "",
        }),
      ]);
      nextCursor.value = response.nextCursor;
    } catch (error) {
      if (requestId !== queryRequestId) {
        return;
      }
      console.error("Failed to load more Email Update preferences", error);
      paginationError.value = t("morePreferencesUnavailable");
    } finally {
      if (requestId === queryRequestId) {
        isLoadingMore.value = false;
      }
    }
  }

  async function loadMoreConversations(
    group: ConversationEmailUpdatePreferenceGroup
  ): Promise<void> {
    const cursor = group.conversationNextCursor;
    const groupKey = getPreferenceGroupKey(group);
    if (
      cursor === undefined ||
      isRefreshing.value ||
      loadingConversationGroupKeys.value.has(groupKey)
    ) {
      return;
    }
    const requestId = queryRequestId;
    const requestToken = {};
    conversationPageRequestTokenByGroup.set(groupKey, requestToken);
    loadingConversationGroupKeys.value = new Set([
      ...loadingConversationGroupKeys.value,
      groupKey,
    ]);
    const nextErrors = new Map(conversationPaginationErrors.value);
    nextErrors.delete(groupKey);
    conversationPaginationErrors.value = nextErrors;
    try {
      const trimmedSearch = search.value.trim();
      const response = await emailUpdatesApi.getPreferenceConversations({
        scope:
          group.kind === "project"
            ? { kind: "project", projectSlug: group.projectSlug }
            : { kind: "no_project" },
        search: trimmedSearch === "" ? undefined : trimmedSearch,
        cursor,
      });
      if (requestId !== queryRequestId) {
        return;
      }
      if (!response.success) {
        setConversationPaginationError({
          groupKey,
          message: getPreferencesError(response.reason),
        });
        return;
      }
      serverGroups.value = serverGroups.value.map((currentGroup) => {
        if (getPreferenceGroupKey(currentGroup) !== groupKey) {
          return currentGroup;
        }
        const existingConversationSlugIds = new Set(
          currentGroup.conversations.map(
            (conversation) => conversation.conversationSlugId
          )
        );
        const conversations = [
          ...currentGroup.conversations,
          ...response.conversations.filter(
            (conversation) =>
              !existingConversationSlugIds.has(conversation.conversationSlugId)
          ),
        ];
        return {
          ...currentGroup,
          conversations,
          conversationNextCursor: response.nextCursor,
        };
      });
    } catch (error) {
      if (requestId !== queryRequestId) {
        return;
      }
      console.error("Failed to load more Email Update conversations", error);
      setConversationPaginationError({
        groupKey,
        message: t("morePreferencesUnavailable"),
      });
    } finally {
      if (conversationPageRequestTokenByGroup.get(groupKey) === requestToken) {
        conversationPageRequestTokenByGroup.delete(groupKey);
        const nextLoadingGroupKeys = new Set(
          loadingConversationGroupKeys.value
        );
        nextLoadingGroupKeys.delete(groupKey);
        loadingConversationGroupKeys.value = nextLoadingGroupKeys;
      }
    }
  }

  async function setGlobalEnabled(enabled: boolean): Promise<void> {
    const optimisticPreference = {
      kind: "global",
      paused: !enabled,
    } satisfies ConversationEmailUpdatePreferenceOverride;
    const revision = beginMutation(optimisticPreference);
    if (revision === undefined) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_global_pause",
        paused: !enabled,
      });
      if (!response.success) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      if (response.result.operation !== "set_global_pause") {
        showNotifyMessage(t("savePreferenceError"));
        reloadAfterMutations = true;
        requiresAuthoritativeReload = true;
        return;
      }
      confirmMutation({ result: response.result, revision });
      removeConversationEmailUpdateSummaryQueries(response.result);
    } catch (error) {
      console.error("Failed to update the Email Updates global pause", error);
      showNotifyMessage(t("savePreferenceError"));
      reloadAfterMutations = true;
      requiresAuthoritativeReload = true;
    } finally {
      finishMutation(optimisticPreference);
    }
  }

  async function setProjectPreference({
    group,
    enabled,
  }: {
    group: ProjectEmailUpdatePreferenceGroup;
    enabled: boolean;
  }): Promise<void> {
    const optimisticPreference = {
      kind: "project",
      projectSlug: group.projectSlug,
      state: enabled ? "enabled" : "disabled",
    } satisfies ConversationEmailUpdatePreferenceOverride;
    const revision = beginMutation(optimisticPreference);
    if (revision === undefined) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_project_preference",
        projectSlug: group.projectSlug,
        enabled,
        source: { kind: "settings" },
      });
      if (!response.success) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      if (
        response.result.operation !== "set_project_preference" ||
        response.result.projectSlug !== group.projectSlug
      ) {
        showNotifyMessage(t("savePreferenceError"));
        reloadAfterMutations = true;
        requiresAuthoritativeReload = true;
        return;
      }
      confirmMutation({ result: response.result, revision });
      removeConversationEmailUpdateSummaryQueries(response.result);
      if (response.result.globalResumed) {
        showNotifyMessage(
          tEmailUpdateResume("preferenceSavedAndGlobalResumed")
        );
      }
    } catch (error) {
      console.error(
        "Failed to update an Email Updates project preference",
        error
      );
      showNotifyMessage(t("savePreferenceError"));
      reloadAfterMutations = true;
      requiresAuthoritativeReload = true;
    } finally {
      finishMutation(optimisticPreference);
    }
  }

  async function setConversationPreference({
    conversationSlugId,
    enabled,
  }: ConversationEmailUpdatePreferenceChange): Promise<void> {
    const optimisticPreference = {
      kind: "conversation",
      conversationSlugId,
      state: enabled ? "enabled" : "disabled",
    } satisfies ConversationEmailUpdatePreferenceOverride;
    const revision = beginMutation(optimisticPreference);
    if (revision === undefined) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_conversation_preference",
        conversationSlugId,
        enabled,
        source: "settings",
      });
      if (!response.success) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      const savedResult =
        response.result.operation === "set_conversation_preference"
          ? response.result
          : undefined;
      const savedPreference = savedResult?.conversationPreferences.find(
        (preference) => preference.conversationSlugId === conversationSlugId
      );
      if (savedResult === undefined || savedPreference === undefined) {
        showNotifyMessage(t("savePreferenceError"));
        reloadAfterMutations = true;
        requiresAuthoritativeReload = true;
        return;
      }
      confirmMutation({ result: savedResult, revision });
      removeConversationEmailUpdateSummaryQueries(savedResult);
      if (savedResult.globalResumed) {
        showNotifyMessage(
          tEmailUpdateResume("preferenceSavedAndGlobalResumed")
        );
      }
    } catch (error) {
      console.error(
        "Failed to update an Email Updates conversation preference",
        error
      );
      showNotifyMessage(t("savePreferenceError"));
      reloadAfterMutations = true;
      requiresAuthoritativeReload = true;
    } finally {
      finishMutation(optimisticPreference);
    }
  }

  function beginMutation(
    preference: ConversationEmailUpdatePreferenceOverride
  ): number | undefined {
    const key = getPreferenceOverrideKey(preference);
    if (pendingOverrides.value.size > 0 || isRefreshing.value) {
      return undefined;
    }
    const revision = ++nextMutationRevision;
    latestMutationRevisionByKey.set(key, revision);
    latestMutationRevisionByKey.set("global", revision);
    pendingOverrides.value = setPreferenceOverrides({
      overrides: pendingOverrides.value,
      preferences: [preference],
    });
    return revision;
  }

  function finishMutation(
    preference: ConversationEmailUpdatePreferenceOverride
  ): void {
    const nextPendingOverrides = new Map(pendingOverrides.value);
    nextPendingOverrides.delete(getPreferenceOverrideKey(preference));
    pendingOverrides.value = nextPendingOverrides;
    if (nextPendingOverrides.size === 0 && reloadAfterMutations) {
      reloadAfterMutations = false;
      void loadFirstPage();
    }
  }

  function confirmMutation({
    result,
    revision,
  }: {
    result: ConversationEmailUpdatePreferenceResult;
    revision: number;
  }): void {
    const currentPreferences = getPreferenceOverridesFromResult(result).filter(
      (preference) =>
        (latestMutationRevisionByKey.get(
          getPreferenceOverrideKey(preference)
        ) ?? 0) <= revision
    );
    confirmedOverrides.value = setPreferenceOverrides({
      overrides: confirmedOverrides.value,
      preferences: currentPreferences,
    });
  }

  function updateSearch(value: string | number | null): void {
    focus.value = undefined;
    search.value = normalizeSearch(value === null ? undefined : String(value));
    void loadFirstPage();
  }

  function handlePreferenceLoadError({
    message,
    queryKey,
  }: {
    message: string;
    queryKey: string;
  }): void {
    if (
      !requiresAuthoritativeReload &&
      hasLoadedPreferences &&
      lastLoadedQueryKey === queryKey
    ) {
      showNotifyMessage(message);
    } else {
      loadError.value = message;
    }
  }

  function setConversationPaginationError({
    groupKey,
    message,
  }: {
    groupKey: string;
    message: string;
  }): void {
    conversationPaginationErrors.value = new Map([
      ...conversationPaginationErrors.value,
      [groupKey, message],
    ]);
  }

  function setGroupExpanded({
    groupKey,
    expanded,
  }: {
    groupKey: string;
    expanded: boolean;
  }): void {
    const nextExpandedGroupKeys = new Set(expandedGroupKeys.value);
    if (expanded) {
      nextExpandedGroupKeys.add(groupKey);
    } else {
      nextExpandedGroupKeys.delete(groupKey);
    }
    expandedGroupKeys.value = nextExpandedGroupKeys;
  }

  function getPreferencesError(
    reason: "preferences_unavailable" | "verified_email_required"
  ): string {
    return reason === "verified_email_required"
      ? t("verifiedEmailRequired")
      : t("preferencesUnavailable");
  }

  onMounted(() => {
    void loadFirstPage();
  });

  return {
    expandedGroupKeys,
    conversationPaginationErrors,
    globalEnabled,
    groups,
    isInitialLoading,
    isLoadingMore,
    isPreferenceSaving,
    isRefreshing,
    loadingConversationGroupKeys,
    loadError,
    loadFirstPage,
    loadMore,
    loadMoreConversations,
    nextCursor,
    paginationError,
    search,
    setConversationPreference,
    setGlobalEnabled,
    setGroupExpanded,
    setProjectPreference,
    updateSearch,
  };
}

function normalizeSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(
    0,
    CONVERSATION_EMAIL_UPDATE_PREFERENCE_SEARCH_MAX_LENGTH
  );
}

function getPreferenceQueryKey({
  focus,
  search,
}: {
  focus: ConversationEmailUpdatePreferenceFocus | undefined;
  search: string;
}): string {
  if (focus === undefined) {
    return `browse:${search}`;
  }
  return focus.kind === "project"
    ? `focus:project:${focus.projectSlug}`
    : `focus:conversation:${focus.conversationSlugId}`;
}
