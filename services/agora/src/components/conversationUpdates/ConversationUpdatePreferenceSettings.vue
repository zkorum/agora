<template>
  <section class="preference-settings">
    <div class="preference-settings__intro">
      <span>Email Updates</span>
      <h1>Choose what brings you back</h1>
      <p>
        Keep your choices specific. Project preferences apply by default, while
        a conversation choice can make an exception.
      </p>
    </div>

    <q-input
      :model-value="search"
      outlined
      clearable
      debounce="350"
      label="Search projects and conversations"
      @update:model-value="updateSearch"
    >
      <template #prepend><q-icon name="mdi-magnify" /></template>
    </q-input>

    <PageLoadingSpinner v-if="isInitialLoading" />

    <ErrorRetryBlock
      v-else-if="loadError !== undefined"
      :title="loadError"
      retry-label="Try again"
      @retry="loadFirstPage"
    />

    <template v-else>
      <ZKInfoBanner
        v-if="saveError !== undefined"
        :message="saveError"
        variant="warning"
      />
      <ZKInfoBanner
        v-if="paginationError !== undefined"
        :message="paginationError"
        variant="warning"
      />

      <q-card flat bordered class="preference-settings__pause-card">
        <q-card-section class="preference-settings__switch-row">
          <div>
            <strong>Pause all Email Updates</strong>
            <span>Your project and conversation choices stay saved.</span>
            <span v-if="isSaving('global')">Saving...</span>
          </div>
          <ZKSwitch
            :model-value="globalPaused"
            :disable="isSaving('global')"
            aria-label="Pause all Email Updates"
            @update:model-value="setGlobalPaused"
          />
        </q-card-section>
      </q-card>

      <ZKInfoBanner
        v-if="globalPaused"
        message="All Email Updates are paused. Your choices below remain saved and can still be changed."
      />

      <p v-if="groups.length === 0" class="preference-settings__empty">
        No Email Update preferences match this search.
      </p>

      <section
        v-for="group in groups"
        :key="getGroupKey(group)"
        class="preference-settings__group"
      >
        <div class="preference-settings__group-heading">
          <template v-if="group.kind === 'project'">
            <h2>Projects</h2>
            <span>Set a default, then adjust individual conversations.</span>
          </template>
          <template v-else>
            <h2>No Project</h2>
            <span
              >These conversations each have their own explicit choice.</span
            >
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
                This project preference is temporarily unavailable.
              </span>
              <span v-if="isSaving(`project:${group.projectSlug}`)">
                Saving...
              </span>
            </div>
            <ZKSwitch
              :model-value="group.state === 'enabled'"
              :disable="
                group.availability === 'temporarily_unavailable' ||
                isSaving(`project:${group.projectSlug}`)
              "
              :aria-label="`Receive Email Updates for ${group.projectTitle}`"
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
                  This conversation preference is temporarily unavailable.
                </q-item-label>
                <q-item-label
                  v-if="
                    isSaving(`conversation:${conversation.conversationSlugId}`)
                  "
                  caption
                >
                  Saving...
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <ZKSwitch
                  :model-value="conversation.state === 'enabled'"
                  :disable="
                    conversation.availability === 'temporarily_unavailable' ||
                    isSaving(`conversation:${conversation.conversationSlugId}`)
                  "
                  :aria-label="`Receive Email Updates for ${conversation.conversationTitle}`"
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
          label="Load more"
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
import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { onMounted, ref, watch } from "vue";

type ProjectPreferenceGroup = Extract<
  ConversationEmailUpdatePreferenceGroup,
  { kind: "project" }
>;

const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const search = ref("");
const groups = ref<readonly ConversationEmailUpdatePreferenceGroup[]>([]);
const globalPaused = ref(false);
const nextCursor = ref<string | undefined>(undefined);
const isInitialLoading = ref(true);
const isLoadingMore = ref(false);
const loadError = ref<string | undefined>(undefined);
const saveError = ref<string | undefined>(undefined);
const paginationError = ref<string | undefined>(undefined);
const savingKeys = ref<ReadonlySet<string>>(new Set());
const optimisticValues = ref<ReadonlyMap<string, boolean>>(new Map());
let loadRequestId = 0;
let mutationGeneration = 0;
const mutationGenerations = new Map<string, number>();

watch(search, loadFirstPage);

async function loadFirstPage(): Promise<void> {
  await fetchFirstPage({ showLoading: true });
}

async function fetchFirstPage({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  const requestId = ++loadRequestId;
  isLoadingMore.value = false;
  paginationError.value = undefined;
  if (showLoading) {
    isInitialLoading.value = true;
  }
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
      const message = getPreferencesError(response.reason);
      if (showLoading) {
        loadError.value = message;
      } else {
        saveError.value = message;
      }
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
      const message = "Email Update preferences are unavailable right now.";
      if (showLoading) {
        loadError.value = message;
      } else {
        saveError.value = message;
      }
    }
  } finally {
    if (requestId === loadRequestId) {
      if (showLoading) {
        isInitialLoading.value = false;
      }
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
    paginationError.value =
      "More Email Update preferences could not be loaded.";
  } finally {
    if (requestId === loadRequestId) {
      isLoadingMore.value = false;
    }
  }
}

async function setGlobalPaused(paused: boolean): Promise<void> {
  const key = "global";
  const generation = beginMutation({ key, value: paused });
  const previousValue = globalPaused.value;
  globalPaused.value = paused;
  saveError.value = undefined;
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_global_pause",
      paused,
    });
    if (!response.success) {
      rollbackGlobalPreference({ key, generation, previousValue });
      saveError.value = "The global pause setting could not be saved.";
    } else if (response.result.operation !== "set_global_pause") {
      rollbackGlobalPreference({ key, generation, previousValue });
      saveError.value = "The global pause setting could not be saved.";
    } else if (isCurrentMutation({ key, generation })) {
      globalPaused.value = response.result.globalPaused;
    }
  } catch (error) {
    console.error("Failed to update the Email Updates global pause", error);
    rollbackGlobalPreference({ key, generation, previousValue });
    saveError.value = "The global pause setting could not be saved.";
  } finally {
    finishMutation({ key, generation });
  }
  await refreshLoadedGroups();
}

async function setProjectPreference({
  group,
  enabled,
}: {
  group: ProjectPreferenceGroup;
  enabled: boolean;
}): Promise<void> {
  const key = `project:${group.projectSlug}`;
  const generation = beginMutation({ key, value: enabled });
  const previousState = group.state;
  saveError.value = undefined;
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
      source: "settings",
    });
    if (!response.success) {
      rollbackProjectPreference({
        key,
        generation,
        projectSlug: group.projectSlug,
        previousState,
      });
      saveError.value = "The project preference could not be saved.";
    }
  } catch (error) {
    console.error(
      "Failed to update an Email Updates project preference",
      error
    );
    rollbackProjectPreference({
      key,
      generation,
      projectSlug: group.projectSlug,
      previousState,
    });
    saveError.value = "The project preference could not be saved.";
  } finally {
    finishMutation({ key, generation });
  }
  await refreshLoadedGroups();
}

async function setConversationPreference({
  conversationSlugId,
  enabled,
}: {
  conversationSlugId: string;
  enabled: boolean;
}): Promise<void> {
  const key = `conversation:${conversationSlugId}`;
  const generation = beginMutation({ key, value: enabled });
  const previousState = getConversationPreferenceState(conversationSlugId);
  saveError.value = undefined;
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
    if (!response.success) {
      rollbackConversationPreference({
        key,
        generation,
        conversationSlugId,
        previousState,
      });
      saveError.value = "The conversation preference could not be saved.";
    }
  } catch (error) {
    console.error(
      "Failed to update an Email Updates conversation preference",
      error
    );
    rollbackConversationPreference({
      key,
      generation,
      conversationSlugId,
      previousState,
    });
    saveError.value = "The conversation preference could not be saved.";
  } finally {
    finishMutation({ key, generation });
  }
  await refreshLoadedGroups();
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
        saveError.value = getPreferencesError(response.reason);
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
    if (requestId === loadRequestId) {
      saveError.value = "Email Update preferences are unavailable right now.";
    }
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
  groups.value = groups.value.map((group) =>
    group.kind === "project" && group.projectSlug === projectSlug
      ? { ...group, state: previousState }
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
  groups.value = groups.value.map((group) => ({
    ...group,
    conversations: group.conversations.map((conversation) =>
      conversation.conversationSlugId === conversationSlugId
        ? { ...conversation, state: previousState }
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
    return "On for this project";
  }
  if (group.state === "disabled") {
    return "Off for this project";
  }
  return "No project choice saved";
}

function getConversationChoiceLabel(state: "disabled" | "enabled"): string {
  return state === "enabled"
    ? "On for this conversation"
    : "Off for this conversation";
}

function getPreferencesError(
  reason: "preferences_unavailable" | "verified_email_required"
): string {
  return reason === "verified_email_required"
    ? "Verify an email address before changing Email Update preferences."
    : "Email Update preferences are unavailable right now.";
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
