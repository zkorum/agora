import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useRemoveConversationEmailUpdateSummaryQueries } from "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, watch } from "vue";

import {
  applyPreferenceOverrides,
  CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE,
  getAutoExpandedProjectSlugs,
  getNoProjectConversations,
  getPreferenceOverrideKey,
  getPreferenceOverridesFromResult,
  getProjectPreferenceGroups,
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

export function useConversationUpdatePreferences() {
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

  const search = ref("");
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
  const expandedProjectSlugs = ref<ReadonlySet<string>>(new Set());
  const nextCursor = ref<string | undefined>(undefined);
  const isInitialLoading = ref(true);
  const isLoadingMore = ref(false);
  const loadError = ref<string | undefined>(undefined);
  const paginationError = ref<string | undefined>(undefined);
  let queryRequestId = 0;

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
  const projectGroups = computed(() =>
    getProjectPreferenceGroups(groups.value)
  );
  const noProjectConversations = computed(() =>
    getNoProjectConversations(groups.value)
  );
  const isGlobalSaving = computed(() => pendingOverrides.value.has("global"));
  const savingProjectSlugs = computed<ReadonlySet<string>>(
    () =>
      new Set(
        [...pendingOverrides.value.values()].flatMap((preference) =>
          preference.kind === "project" ? [preference.projectSlug] : []
        )
      )
  );
  const savingConversationSlugIds = computed<ReadonlySet<string>>(
    () =>
      new Set(
        [...pendingOverrides.value.values()].flatMap((preference) =>
          preference.kind === "conversation"
            ? [preference.conversationSlugId]
            : []
        )
      )
  );

  watch(search, () => {
    void loadFirstPage();
  });

  async function loadFirstPage(): Promise<void> {
    const requestId = ++queryRequestId;
    isLoadingMore.value = false;
    paginationError.value = undefined;
    isInitialLoading.value = true;
    loadError.value = undefined;
    try {
      const trimmedSearch = search.value.trim();
      const response = await emailUpdatesApi.getPreferences({
        search: trimmedSearch === "" ? undefined : trimmedSearch,
        limit: CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE,
      });
      if (requestId !== queryRequestId) {
        return;
      }
      if (!response.success) {
        loadError.value = getPreferencesError(response.reason);
        return;
      }
      serverGlobalPaused.value = response.globalPaused;
      serverGroups.value = response.groups;
      expandedProjectSlugs.value = getAutoExpandedProjectSlugs({
        groups: response.groups,
        expandAll: trimmedSearch !== "",
      });
      nextCursor.value = response.nextCursor;
    } catch (error) {
      console.error("Failed to load Email Update preferences", error);
      if (requestId === queryRequestId) {
        loadError.value = t("preferencesUnavailable");
      }
    } finally {
      if (requestId === queryRequestId) {
        isInitialLoading.value = false;
      }
    }
  }

  async function loadMore(): Promise<void> {
    const cursor = nextCursor.value;
    if (cursor === undefined || isLoadingMore.value) {
      return;
    }
    const requestId = queryRequestId;
    isLoadingMore.value = true;
    paginationError.value = undefined;
    try {
      const trimmedSearch = search.value.trim();
      const response = await emailUpdatesApi.getPreferences({
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
      expandedProjectSlugs.value = new Set([
        ...expandedProjectSlugs.value,
        ...getAutoExpandedProjectSlugs({
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

  async function setGlobalEnabled(enabled: boolean): Promise<void> {
    const optimisticPreference = {
      kind: "global",
      paused: !enabled,
    } satisfies ConversationEmailUpdatePreferenceOverride;
    if (!beginMutation(optimisticPreference)) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_global_pause",
        paused: !enabled,
      });
      if (
        !response.success ||
        response.result.operation !== "set_global_pause"
      ) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      confirmMutation(response.result);
      removeConversationEmailUpdateSummaryQueries(response.result);
      showNotifyMessage(
        t(response.result.globalPaused ? "pauseSaved" : "resumeSaved")
      );
    } catch (error) {
      console.error("Failed to update the Email Updates global pause", error);
      showNotifyMessage(t("savePreferenceError"));
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
    if (!beginMutation(optimisticPreference)) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_project_preference",
        projectSlug: group.projectSlug,
        enabled,
        source: { kind: "settings" },
      });
      if (
        !response.success ||
        response.result.operation !== "set_project_preference" ||
        response.result.projectSlug !== group.projectSlug
      ) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      confirmMutation(response.result);
      removeConversationEmailUpdateSummaryQueries(response.result);
      showNotifyMessage(
        response.result.globalResumed
          ? tEmailUpdateResume("preferenceSavedAndGlobalResumed")
          : t(
              response.result.state === "enabled"
                ? "preferenceOnSaved"
                : "preferenceOffSaved"
            )
      );
    } catch (error) {
      console.error(
        "Failed to update an Email Updates project preference",
        error
      );
      showNotifyMessage(t("savePreferenceError"));
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
      resolvedEnabled: undefined,
    } satisfies ConversationEmailUpdatePreferenceOverride;
    if (!beginMutation(optimisticPreference)) {
      return;
    }
    try {
      const response = await emailUpdatesApi.updatePreference({
        operation: "set_conversation_preference",
        conversationSlugId,
        enabled,
        source: "settings",
      });
      const savedResult =
        response.success &&
        response.result.operation === "set_conversation_preference"
          ? response.result
          : undefined;
      const savedPreference = savedResult?.conversationPreferences.find(
        (preference) => preference.conversationSlugId === conversationSlugId
      );
      if (savedResult === undefined || savedPreference === undefined) {
        showNotifyMessage(t("savePreferenceError"));
        return;
      }
      confirmMutation(savedResult);
      removeConversationEmailUpdateSummaryQueries(savedResult);
      showNotifyMessage(
        savedResult.globalResumed
          ? tEmailUpdateResume("preferenceSavedAndGlobalResumed")
          : t(
              savedPreference.state === "enabled"
                ? "preferenceOnSaved"
                : "preferenceOffSaved"
            )
      );
    } catch (error) {
      console.error(
        "Failed to update an Email Updates conversation preference",
        error
      );
      showNotifyMessage(t("savePreferenceError"));
    } finally {
      finishMutation(optimisticPreference);
    }
  }

  function beginMutation(
    preference: ConversationEmailUpdatePreferenceOverride
  ): boolean {
    const key = getPreferenceOverrideKey(preference);
    if (pendingOverrides.value.has(key)) {
      return false;
    }
    pendingOverrides.value = setPreferenceOverrides({
      overrides: pendingOverrides.value,
      preferences: [preference],
    });
    return true;
  }

  function finishMutation(
    preference: ConversationEmailUpdatePreferenceOverride
  ): void {
    const nextPendingOverrides = new Map(pendingOverrides.value);
    nextPendingOverrides.delete(getPreferenceOverrideKey(preference));
    pendingOverrides.value = nextPendingOverrides;
  }

  function confirmMutation(
    result: ConversationEmailUpdatePreferenceResult
  ): void {
    confirmedOverrides.value = setPreferenceOverrides({
      overrides: confirmedOverrides.value,
      preferences: getPreferenceOverridesFromResult(result),
    });
  }

  function updateSearch(value: string | number | null): void {
    search.value = value === null ? "" : String(value);
  }

  function setProjectExpanded({
    projectSlug,
    expanded,
  }: {
    projectSlug: string;
    expanded: boolean;
  }): void {
    const nextExpandedProjectSlugs = new Set(expandedProjectSlugs.value);
    if (expanded) {
      nextExpandedProjectSlugs.add(projectSlug);
    } else {
      nextExpandedProjectSlugs.delete(projectSlug);
    }
    expandedProjectSlugs.value = nextExpandedProjectSlugs;
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
    expandedProjectSlugs,
    globalEnabled,
    groups,
    isGlobalSaving,
    isInitialLoading,
    isLoadingMore,
    loadError,
    loadFirstPage,
    loadMore,
    nextCursor,
    noProjectConversations,
    paginationError,
    projectGroups,
    savingConversationSlugIds,
    savingProjectSlugs,
    search,
    setConversationPreference,
    setGlobalEnabled,
    setProjectExpanded,
    setProjectPreference,
    updateSearch,
  };
}
