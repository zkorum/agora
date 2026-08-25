<template>
  <section class="preference-settings">
    <div class="preference-settings__intro">
      <span>{{ t("emailUpdates") }}</span>
      <h1>{{ t("heading") }}</h1>
      <p>{{ t("description") }}</p>
    </div>

    <q-input
      :model-value="search"
      outlined
      clearable
      debounce="350"
      :label="t('searchLabel')"
      @update:model-value="updateSearch"
    >
      <template #prepend><q-icon name="mdi-magnify" /></template>
    </q-input>

    <PageLoadingSpinner v-if="isInitialLoading" />

    <ErrorRetryBlock
      v-else-if="loadError !== undefined"
      :title="loadError"
      :retry-label="t('tryAgain')"
      @retry="loadFirstPage"
    />

    <template v-else>
      <ZKInfoBanner
        v-if="paginationError !== undefined"
        :message="paginationError"
        variant="warning"
      />

      <q-card flat bordered class="preference-settings__pause-card">
        <q-card-section class="preference-settings__switch-row">
          <div>
            <strong>{{ t("pauseAll") }}</strong>
            <span>{{ t("pauseDescription") }}</span>
            <span v-if="isSaving('global')">{{ t("saving") }}</span>
          </div>
          <ZKSwitch
            :model-value="globalPaused"
            :disable="isSaving('global')"
            :aria-label="t('pauseAll')"
            @update:model-value="setGlobalPaused"
          />
        </q-card-section>
      </q-card>

      <ZKInfoBanner v-if="globalPaused" :message="t('pausedDescription')" />

      <p v-if="groups.length === 0" class="preference-settings__empty">
        {{ t("empty") }}
      </p>

      <section
        v-for="group in groups"
        :key="getGroupKey(group)"
        class="preference-settings__group"
      >
        <div class="preference-settings__group-heading">
          <template v-if="group.kind === 'project'">
            <h2>{{ t("projects") }}</h2>
            <span>{{ t("projectsDescription") }}</span>
          </template>
          <template v-else>
            <h2>{{ t("noProject") }}</h2>
            <span>{{ t("noProjectDescription") }}</span>
          </template>
        </div>

        <q-card flat bordered class="preference-settings__scope-card">
          <q-card-section
            v-if="group.kind === 'project'"
            class="preference-settings__switch-row"
          >
            <div>
              <SpaLink :to="`/project/${group.projectSlug}`">
                <strong>{{ group.projectTitle }}</strong>
                <q-icon name="mdi-arrow-up-right" />
              </SpaLink>
              <span>{{ getProjectChoiceLabel(group) }}</span>
              <span v-if="group.availability === 'temporarily_unavailable'">
                {{ t("projectUnavailable") }}
              </span>
              <span v-if="isSaving(`project:${group.projectSlug}`)">
                {{ t("saving") }}
              </span>
            </div>
            <ZKSwitch
              :model-value="group.state === 'enabled'"
              :disable="
                group.availability === 'temporarily_unavailable' ||
                isSaving(`project:${group.projectSlug}`)
              "
              :aria-label="
                t('receiveEmailUpdatesFor', { name: group.projectTitle })
              "
              @update:model-value="
                setProjectPreference({ group, enabled: $event })
              "
            />
          </q-card-section>

          <q-separator v-if="group.kind === 'project'" />

          <q-list separator>
            <q-item
              v-for="conversation in group.conversations"
              :key="conversation.conversationSlugId"
              class="preference-settings__conversation-row"
            >
              <q-item-section>
                <SpaLink
                  :to="`/conversation/${conversation.conversationSlugId}`"
                >
                  {{ conversation.conversationTitle }}
                </SpaLink>
                <q-item-label caption>
                  {{ getConversationChoiceLabel(conversation.state) }}
                </q-item-label>
                <q-item-label
                  v-if="conversation.availability === 'temporarily_unavailable'"
                  caption
                >
                  {{ t("conversationUnavailable") }}
                </q-item-label>
                <q-item-label
                  v-if="
                    isSaving(`conversation:${conversation.conversationSlugId}`)
                  "
                  caption
                >
                  {{ t("saving") }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <ZKSwitch
                  :model-value="conversation.state === 'enabled'"
                  :disable="
                    conversation.availability === 'temporarily_unavailable' ||
                    isSaving(`conversation:${conversation.conversationSlugId}`)
                  "
                  :aria-label="
                    t('receiveEmailUpdatesFor', {
                      name: conversation.conversationTitle,
                    })
                  "
                  @update:model-value="
                    setConversationPreference({
                      conversationSlugId: conversation.conversationSlugId,
                      enabled: $event,
                    })
                  "
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </section>

      <div v-if="nextCursor !== undefined" class="preference-settings__more">
        <ZKButton
          button-type="standardButton"
          outline
          color="primary"
          :label="t('loadMore')"
          :loading="isLoadingMore"
          :disable="isLoadingMore"
          @click="loadMore"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useRemoveConversationEmailUpdateSummaryQueries } from "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref, watch } from "vue";

import {
  type ConversationUpdatePreferenceSettingsTranslations,
  conversationUpdatePreferenceSettingsTranslations,
} from "./ConversationUpdatePreferenceSettings.i18n";
import {
  type EmailUpdateResumeNotificationTranslations,
  emailUpdateResumeNotificationTranslations,
} from "./emailUpdateResumeNotification.i18n";

type ProjectPreferenceGroup = Extract<
  ConversationEmailUpdatePreferenceGroup,
  { kind: "project" }
>;

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
const groups = ref<readonly ConversationEmailUpdatePreferenceGroup[]>([]);
const globalPaused = ref(false);
const nextCursor = ref<string | undefined>(undefined);
const isInitialLoading = ref(true);
const isLoadingMore = ref(false);
const loadError = ref<string | undefined>(undefined);
const paginationError = ref<string | undefined>(undefined);
const savingKeys = ref<ReadonlySet<string>>(new Set());
const optimisticValues = ref<ReadonlyMap<string, boolean>>(new Map());
let loadRequestId = 0;
let mutationGeneration = 0;
const mutationGenerations = new Map<string, number>();

watch(search, loadFirstPage);

async function loadFirstPage(): Promise<void> {
  const requestId = ++loadRequestId;
  isLoadingMore.value = false;
  paginationError.value = undefined;
  isInitialLoading.value = true;
  loadError.value = undefined;
  try {
    const trimmedSearch = search.value.trim();
    const response = await emailUpdatesApi.getPreferences({
      search: trimmedSearch === "" ? undefined : trimmedSearch,
      limit: 20,
    });
    if (requestId !== loadRequestId) {
      return;
    }
    if (!response.success) {
      loadError.value = getPreferencesError(response.reason);
      return;
    }
    applyPreferenceState({
      globalPaused: response.globalPaused,
      groups: response.groups,
    });
    nextCursor.value = response.nextCursor;
  } catch (error) {
    console.error("Failed to load Email Update preferences", error);
    if (requestId === loadRequestId) {
      loadError.value = t("preferencesUnavailable");
    }
  } finally {
    if (requestId === loadRequestId) {
      isInitialLoading.value = false;
    }
  }
}

async function loadMore(): Promise<void> {
  const cursor = nextCursor.value;
  if (cursor === undefined || isLoadingMore.value) {
    return;
  }
  const requestId = loadRequestId;
  isLoadingMore.value = true;
  paginationError.value = undefined;
  try {
    const trimmedSearch = search.value.trim();
    const response = await emailUpdatesApi.getPreferences({
      search: trimmedSearch === "" ? undefined : trimmedSearch,
      cursor,
      limit: 20,
    });
    if (requestId !== loadRequestId) {
      return;
    }
    if (!response.success) {
      paginationError.value = getPreferencesError(response.reason);
      return;
    }
    applyPreferenceState({
      globalPaused: response.globalPaused,
      groups: [...groups.value, ...response.groups],
    });
    nextCursor.value = response.nextCursor;
  } catch (error) {
    if (requestId !== loadRequestId) {
      return;
    }
    console.error("Failed to load more Email Update preferences", error);
    paginationError.value = t("morePreferencesUnavailable");
  } finally {
    if (requestId === loadRequestId) {
      isLoadingMore.value = false;
    }
  }
}

async function setGlobalPaused(paused: boolean): Promise<void> {
  const key = "global";
  if (isSaving(key)) {
    return;
  }
  const generation = beginMutation({ key, value: paused });
  const previousValue = globalPaused.value;
  globalPaused.value = paused;
  let shouldReconcile = false;
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_global_pause",
      paused,
    });
    if (!isCurrentMutation({ key, generation })) {
      return;
    }
    shouldReconcile = true;
    if (!response.success || response.result.operation !== "set_global_pause") {
      rollbackGlobalPreference({ key, generation, previousValue });
      showNotifyMessage(t("savePreferenceError"));
    } else {
      removeConversationEmailUpdateSummaryQueries(response.result);
      globalPaused.value = response.result.globalPaused;
      showNotifyMessage(
        t(response.result.globalPaused ? "pauseSaved" : "resumeSaved")
      );
    }
  } catch (error) {
    console.error("Failed to update the Email Updates global pause", error);
    if (isCurrentMutation({ key, generation })) {
      shouldReconcile = true;
      rollbackGlobalPreference({ key, generation, previousValue });
      showNotifyMessage(t("savePreferenceError"));
    }
  } finally {
    finishMutation({ key, generation });
  }
  if (shouldReconcile) {
    await refreshLoadedGroups();
  }
}

async function setProjectPreference({
  group,
  enabled,
}: {
  group: ProjectPreferenceGroup;
  enabled: boolean;
}): Promise<void> {
  const key = `project:${group.projectSlug}`;
  if (isSaving(key)) {
    return;
  }
  const generation = beginMutation({ key, value: enabled });
  const previousState = group.state;
  let shouldReconcile = false;
  groups.value = groups.value.map((item) =>
    item.kind === "project" && item.projectSlug === group.projectSlug
      ? {
          ...item,
          state: enabled ? "enabled" : "disabled",
        }
      : item
  );
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_project_preference",
      projectSlug: group.projectSlug,
      enabled,
      source: { kind: "settings" },
    });
    if (!isCurrentMutation({ key, generation })) {
      return;
    }
    shouldReconcile = true;
    if (
      !response.success ||
      response.result.operation !== "set_project_preference" ||
      response.result.projectSlug !== group.projectSlug
    ) {
      rollbackProjectPreference({
        key,
        generation,
        projectSlug: group.projectSlug,
        previousState,
      });
      showNotifyMessage(t("savePreferenceError"));
    } else {
      removeConversationEmailUpdateSummaryQueries(response.result);
      if (response.result.globalResumed) {
        globalPaused.value = false;
      }
      setProjectState({
        projectSlug: group.projectSlug,
        state: response.result.state,
      });
      showNotifyMessage(
        response.result.globalResumed
          ? tEmailUpdateResume("preferenceSavedAndGlobalResumed")
          : t(
              response.result.state === "enabled"
                ? "preferenceOnSaved"
                : "preferenceOffSaved"
            )
      );
    }
  } catch (error) {
    console.error(
      "Failed to update an Email Updates project preference",
      error
    );
    if (isCurrentMutation({ key, generation })) {
      shouldReconcile = true;
      rollbackProjectPreference({
        key,
        generation,
        projectSlug: group.projectSlug,
        previousState,
      });
      showNotifyMessage(t("savePreferenceError"));
    }
  } finally {
    finishMutation({ key, generation });
  }
  if (shouldReconcile) {
    await refreshLoadedGroups();
  }
}

async function setConversationPreference({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: string;
  enabled: boolean;
}): Promise<void> {
  const key = `conversation:${conversationSlugId}`;
  if (isSaving(key)) {
    return;
  }
  const generation = beginMutation({ key, value: enabled });
  const previousState = getConversationPreferenceState(conversationSlugId);
  let shouldReconcile = false;
  groups.value = groups.value.map((group) => ({
    ...group,
    conversations: group.conversations.map((conversation) =>
      conversation.conversationSlugId === conversationSlugId
        ? {
            ...conversation,
            state: enabled ? "enabled" : "disabled",
          }
        : conversation
    ),
  }));
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_conversation_preference",
      conversationSlugId,
      enabled,
      source: "settings",
    });
    if (!isCurrentMutation({ key, generation })) {
      return;
    }
    shouldReconcile = true;
    const savedResult =
      response.success &&
      response.result.operation === "set_conversation_preference"
        ? response.result
        : undefined;
    const savedPreference = savedResult?.conversationPreferences.find(
      (preference) => preference.conversationSlugId === conversationSlugId
    );
    if (savedResult === undefined || savedPreference === undefined) {
      rollbackConversationPreference({
        key,
        generation,
        conversationSlugId,
        previousState,
      });
      showNotifyMessage(t("savePreferenceError"));
    } else {
      removeConversationEmailUpdateSummaryQueries(savedResult);
      if (savedResult.globalResumed) {
        globalPaused.value = false;
      }
      setConversationState({
        conversationSlugId,
        state: savedPreference.state,
      });
      showNotifyMessage(
        savedResult.globalResumed
          ? tEmailUpdateResume("preferenceSavedAndGlobalResumed")
          : t(
              savedPreference.state === "enabled"
                ? "preferenceOnSaved"
                : "preferenceOffSaved"
            )
      );
    }
  } catch (error) {
    console.error(
      "Failed to update an Email Updates conversation preference",
      error
    );
    if (isCurrentMutation({ key, generation })) {
      shouldReconcile = true;
      rollbackConversationPreference({
        key,
        generation,
        conversationSlugId,
        previousState,
      });
      showNotifyMessage(t("savePreferenceError"));
    }
  } finally {
    finishMutation({ key, generation });
  }
  if (shouldReconcile) {
    await refreshLoadedGroups();
  }
}

async function refreshLoadedGroups(): Promise<void> {
  const requestId = ++loadRequestId;
  isLoadingMore.value = false;
  const visibleGroupCount = groups.value.length;
  const trimmedSearch = search.value.trim();
  const refreshedGroups: ConversationEmailUpdatePreferenceGroup[] = [];
  let cursor: string | undefined;
  let refreshedGlobalPaused: boolean;

  try {
    do {
      const response = await emailUpdatesApi.getPreferences({
        search: trimmedSearch === "" ? undefined : trimmedSearch,
        cursor,
        limit: 20,
      });
      if (requestId !== loadRequestId) {
        return;
      }
      if (!response.success) {
        return;
      }

      refreshedGlobalPaused = response.globalPaused;
      refreshedGroups.push(...response.groups);
      cursor = response.nextCursor;
    } while (
      cursor !== undefined &&
      refreshedGroups.length < visibleGroupCount
    );

    applyPreferenceState({
      globalPaused: refreshedGlobalPaused,
      groups: refreshedGroups,
    });
    nextCursor.value = cursor;
    paginationError.value = undefined;
  } catch (error) {
    console.error("Failed to refresh Email Update preferences", error);
  }
}

function beginMutation({
  key,
  value,
}: {
  key: string;
  value: boolean;
}): number {
  mutationGeneration += 1;
  mutationGenerations.set(key, mutationGeneration);
  const nextValues = new Map(optimisticValues.value);
  nextValues.set(key, value);
  optimisticValues.value = nextValues;
  setSaving(key, true);
  return mutationGeneration;
}

function finishMutation({
  key,
  generation,
}: {
  key: string;
  generation: number;
}): void {
  if (!isCurrentMutation({ key, generation })) {
    return;
  }
  mutationGenerations.delete(key);
  const nextValues = new Map(optimisticValues.value);
  nextValues.delete(key);
  optimisticValues.value = nextValues;
  setSaving(key, false);
}

function isCurrentMutation({
  key,
  generation,
}: {
  key: string;
  generation: number;
}): boolean {
  return mutationGenerations.get(key) === generation;
}

function rollbackGlobalPreference({
  key,
  generation,
  previousValue,
}: {
  key: string;
  generation: number;
  previousValue: boolean;
}): void {
  if (isCurrentMutation({ key, generation })) {
    globalPaused.value = previousValue;
  }
}

function rollbackProjectPreference({
  key,
  generation,
  projectSlug,
  previousState,
}: {
  key: string;
  generation: number;
  projectSlug: string;
  previousState: ProjectPreferenceGroup["state"];
}): void {
  if (!isCurrentMutation({ key, generation })) {
    return;
  }
  setProjectState({ projectSlug, state: previousState });
}

function setProjectState({
  projectSlug,
  state,
}: {
  projectSlug: string;
  state: ProjectPreferenceGroup["state"];
}): void {
  groups.value = groups.value.map((group) =>
    group.kind === "project" && group.projectSlug === projectSlug
      ? { ...group, state }
      : group
  );
}

function rollbackConversationPreference({
  key,
  generation,
  conversationSlugId,
  previousState,
}: {
  key: string;
  generation: number;
  conversationSlugId: string;
  previousState: "disabled" | "enabled" | undefined;
}): void {
  if (previousState === undefined || !isCurrentMutation({ key, generation })) {
    return;
  }
  setConversationState({ conversationSlugId, state: previousState });
}

function setConversationState({
  conversationSlugId,
  state,
}: {
  conversationSlugId: string;
  state: "disabled" | "enabled";
}): void {
  groups.value = groups.value.map((group) => ({
    ...group,
    conversations: group.conversations.map((conversation) =>
      conversation.conversationSlugId === conversationSlugId
        ? { ...conversation, state }
        : conversation
    ),
  }));
}

function getConversationPreferenceState(
  conversationSlugId: string
): "disabled" | "enabled" | undefined {
  return groups.value
    .flatMap((group) => group.conversations)
    .find(
      (conversation) => conversation.conversationSlugId === conversationSlugId
    )?.state;
}

function applyPreferenceState({
  globalPaused: refreshedGlobalPaused,
  groups: refreshedGroups,
}: {
  globalPaused: boolean;
  groups: readonly ConversationEmailUpdatePreferenceGroup[];
}): void {
  globalPaused.value =
    optimisticValues.value.get("global") ?? refreshedGlobalPaused;
  groups.value = refreshedGroups.map((group) => {
    const projectValue =
      group.kind === "project"
        ? optimisticValues.value.get(`project:${group.projectSlug}`)
        : undefined;
    return {
      ...group,
      ...(projectValue === undefined
        ? {}
        : { state: projectValue ? "enabled" : "disabled" }),
      conversations: group.conversations.map((conversation) => {
        const conversationValue = optimisticValues.value.get(
          `conversation:${conversation.conversationSlugId}`
        );
        return conversationValue === undefined
          ? conversation
          : {
              ...conversation,
              state: conversationValue ? "enabled" : "disabled",
            };
      }),
    };
  });
}

function setSaving(key: string, saving: boolean): void {
  const nextKeys = new Set(savingKeys.value);
  if (saving) {
    nextKeys.add(key);
  } else {
    nextKeys.delete(key);
  }
  savingKeys.value = nextKeys;
}

function updateSearch(value: string | number | null): void {
  search.value = value === null ? "" : String(value);
}

function isSaving(key: string): boolean {
  return savingKeys.value.has(key);
}

function getGroupKey(group: ConversationEmailUpdatePreferenceGroup): string {
  return group.kind === "project"
    ? `project:${group.projectSlug}`
    : "no-project";
}

function getProjectChoiceLabel(group: ProjectPreferenceGroup): string {
  if (group.state === "enabled") {
    return t("projectOn");
  }
  if (group.state === "disabled") {
    return t("projectOff");
  }
  return t("projectUnset");
}

function getConversationChoiceLabel(state: "disabled" | "enabled"): string {
  return state === "enabled" ? t("conversationOn") : t("conversationOff");
}

function getPreferencesError(
  reason: "preferences_unavailable" | "verified_email_required"
): string {
  return reason === "verified_email_required"
    ? t("verifiedEmailRequired")
    : t("preferencesUnavailable");
}

onMounted(loadFirstPage);
</script>

<style scoped lang="scss">
.preference-settings {
  display: grid;
  gap: 1.25rem;
  width: min(100%, 46rem);
  margin-inline: auto;
  padding: 1rem;

  &__intro {
    padding: 1rem 0 0.5rem;

    > span {
      color: $primary;
      font-size: 0.78rem;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0.35rem 0 0.5rem;
      color: $color-text-strong;
      font-size: clamp(1.55rem, 5vw, 2.2rem);
    }

    p {
      margin: 0;
      color: $color-text-weak;
      line-height: 1.5;
    }
  }

  &__pause-card,
  &__scope-card {
    overflow: hidden;
    border-radius: 1rem;
  }

  &__pause-card {
    border-color: rgba($primary, 0.28);
    background: rgba($primary, 0.035);
  }

  &__group {
    display: grid;
    gap: 0.75rem;
  }

  &__group-heading {
    h2 {
      margin: 0;
      color: $color-text-strong;
      font-size: 1.05rem;
    }

    span {
      color: $color-text-weak;
      font-size: 0.8rem;
    }
  }

  &__switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    > div {
      display: grid;
      gap: 0.25rem;
    }

    a {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      width: fit-content;
      color: $color-text-strong;
    }

    span {
      color: $color-text-weak;
      font-size: 0.78rem;
      line-height: 1.4;
    }
  }

  &__conversation-row {
    min-height: 4.25rem;

    a {
      color: $color-text-strong;
      font-weight: var(--font-weight-medium);
    }
  }

  &__empty {
    margin: 1rem 0;
    color: $color-text-weak;
    text-align: center;
  }

  &__more {
    display: flex;
    justify-content: center;
  }
}
</style>
