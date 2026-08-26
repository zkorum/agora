<template>
  <section class="preference-settings">
    <SettingsSectionHeader
      :title="undefined"
      :descriptions="[
        t('sectionDescription'),
        t('preferenceHierarchyDescription'),
        t('recommendationDescription'),
      ]"
    />

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

      <SettingsToggleCard
        :label="t('receiveEmailUpdates')"
        :description="
          t(globalEnabled ? 'updatesOnDescription' : 'updatesPausedDescription')
        "
        :model-value="globalEnabled"
        :disabled="isGlobalSaving"
        @update:model-value="setGlobalEnabled"
      />

      <p v-if="groups.length === 0" class="preference-settings__empty">
        {{ t("empty") }}
      </p>

      <q-list
        v-if="groups.length > 0"
        bordered
        separator
        class="preference-settings__groups"
      >
        <ConversationUpdatePreferenceGroupItem
          v-for="group in groups"
          :key="getPreferenceGroupKey(group)"
          :expanded="expandedGroupKeys.has(getPreferenceGroupKey(group))"
          :group="group"
          :label="
            group.kind === 'project' ? group.projectTitle : t('noProject')
          "
          :saving-conversation-slug-ids="savingConversationSlugIds"
          :saving-project="
            group.kind === 'project' &&
            savingProjectSlugs.has(group.projectSlug)
          "
          @update:expanded="
            setGroupExpanded({
              groupKey: getPreferenceGroupKey(group),
              expanded: $event,
            })
          "
          @set-project-enabled="setProjectPreference"
          @set-conversation-enabled="setConversationPreference"
        />
      </q-list>

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
import SettingsSectionHeader from "src/components/ui-library/SettingsSectionHeader.vue";
import SettingsToggleCard from "src/components/ui-library/SettingsToggleCard.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import ConversationUpdatePreferenceGroupItem from "./ConversationUpdatePreferenceGroupItem.vue";
import { getPreferenceGroupKey } from "./conversationUpdatePreferenceLogic";
import {
  type ConversationUpdatePreferenceSettingsTranslations,
  conversationUpdatePreferenceSettingsTranslations,
} from "./ConversationUpdatePreferenceSettings.i18n";
import { useConversationUpdatePreferences } from "./useConversationUpdatePreferences";

const { t } =
  useComponentI18n<ConversationUpdatePreferenceSettingsTranslations>(
    conversationUpdatePreferenceSettingsTranslations
  );
const {
  expandedGroupKeys,
  globalEnabled,
  groups,
  isGlobalSaving,
  isInitialLoading,
  isLoadingMore,
  loadError,
  loadFirstPage,
  loadMore,
  nextCursor,
  paginationError,
  savingConversationSlugIds,
  savingProjectSlugs,
  search,
  setConversationPreference,
  setGlobalEnabled,
  setGroupExpanded,
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

  &__empty {
    margin: 1rem 0;
    color: $color-text-weak;
    text-align: center;
  }

  &__groups {
    overflow: hidden;
    border-radius: 1rem;
  }

  &__more {
    display: flex;
    justify-content: center;
  }
}
</style>
