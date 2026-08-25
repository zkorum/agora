<template>
  <section class="preference-settings">
    <div class="preference-settings__intro">
      <span>{{ t("emailUpdates") }}</span>
      <h1>{{ t("heading") }}</h1>
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

      <ConversationUpdateGlobalPauseCard
        :title="t('pauseAll')"
        :description="t('pauseDescription')"
        :paused="globalPaused"
        :saving="isGlobalSaving"
        @set-paused="setGlobalPaused"
      />

      <p v-if="groups.length === 0" class="preference-settings__empty">
        {{ t("empty") }}
      </p>

      <ConversationUpdatePreferenceSection
        v-if="projectGroups.length > 0"
        :title="t('projects')"
      >
        <ConversationUpdateProjectPreferenceItem
          v-for="group in projectGroups"
          :key="group.projectSlug"
          :expanded="expandedProjectSlugs.has(group.projectSlug)"
          :group="group"
          :saving-conversation-slug-ids="savingConversationSlugIds"
          :saving-project="savingProjectSlugs.has(group.projectSlug)"
          @update:expanded="
            setProjectExpanded({
              projectSlug: group.projectSlug,
              expanded: $event,
            })
          "
          @set-project-enabled="
            setProjectPreference({ group, enabled: $event })
          "
          @set-conversation-enabled="setConversationPreference"
        />
      </ConversationUpdatePreferenceSection>

      <ConversationUpdatePreferenceSection
        v-if="noProjectConversations.length > 0"
        :title="t('noProject')"
      >
        <ConversationUpdatePreferenceRow
          v-for="conversation in noProjectConversations"
          :key="conversation.conversationSlugId"
          :conversation="conversation"
          :nested="false"
          :saving="
            savingConversationSlugIds.has(conversation.conversationSlugId)
          "
          @set-enabled="
            setConversationPreference({
              conversationSlugId: conversation.conversationSlugId,
              enabled: $event,
            })
          "
        />
      </ConversationUpdatePreferenceSection>

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
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import ConversationUpdateGlobalPauseCard from "./ConversationUpdateGlobalPauseCard.vue";
import ConversationUpdatePreferenceRow from "./ConversationUpdatePreferenceRow.vue";
import ConversationUpdatePreferenceSection from "./ConversationUpdatePreferenceSection.vue";
import {
  type ConversationUpdatePreferenceSettingsTranslations,
  conversationUpdatePreferenceSettingsTranslations,
} from "./ConversationUpdatePreferenceSettings.i18n";
import ConversationUpdateProjectPreferenceItem from "./ConversationUpdateProjectPreferenceItem.vue";
import { useConversationUpdatePreferences } from "./useConversationUpdatePreferences";

const { t } =
  useComponentI18n<ConversationUpdatePreferenceSettingsTranslations>(
    conversationUpdatePreferenceSettingsTranslations
  );
const {
  expandedProjectSlugs,
  globalPaused,
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
  setGlobalPaused,
  setProjectExpanded,
  setProjectPreference,
  updateSearch,
} = useConversationUpdatePreferences();
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
