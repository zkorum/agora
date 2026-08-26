<template>
  <section
    class="preference-settings"
    :aria-busy="
      isInitialLoading ||
      isRefreshing ||
      isLoadingMore ||
      loadingConversationGroupKeys.size > 0 ||
      isPreferenceSaving
    "
  >
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
      :maxlength="CONVERSATION_EMAIL_UPDATE_PREFERENCE_SEARCH_MAX_LENGTH"
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
      <SettingsToggleCard
        :label="t('receiveEmailUpdates')"
        :description="
          t(globalEnabled ? 'updatesOnDescription' : 'updatesPausedDescription')
        "
        :model-value="globalEnabled"
        :disabled="isPreferenceSaving || isRefreshing"
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
          :conversation-pagination-error="
            conversationPaginationErrors.get(getPreferenceGroupKey(group))
          "
          :controls-disabled="isPreferenceSaving || isRefreshing"
          :is-loading-more-conversations="
            loadingConversationGroupKeys.has(getPreferenceGroupKey(group))
          "
          :label="
            group.kind === 'project' ? group.projectTitle : t('noProject')
          "
          :retry-label="t('tryAgain')"
          :show-more-label="t('showMore')"
          @load-more-conversations="loadMoreConversations"
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

      <div
        v-if="!isRefreshing && nextCursor !== undefined"
        class="preference-settings__more"
      >
        <ZKLoadMore
          :error-message="paginationError"
          :is-loading="isLoadingMore"
          :loading-label="t('loadingMore')"
          :load-more-label="t('loadMore')"
          :retry-label="t('tryAgain')"
          @action="loadMore"
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
import ZKLoadMore from "src/components/ui-library/ZKLoadMore.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  CONVERSATION_EMAIL_UPDATE_PREFERENCE_SEARCH_MAX_LENGTH,
  type ConversationEmailUpdatePreferenceFocus,
} from "src/shared/types/dto";

import ConversationUpdatePreferenceGroupItem from "./ConversationUpdatePreferenceGroupItem.vue";
import { getPreferenceGroupKey } from "./conversationUpdatePreferenceLogic";
import {
  type ConversationUpdatePreferenceSettingsTranslations,
  conversationUpdatePreferenceSettingsTranslations,
} from "./ConversationUpdatePreferenceSettings.i18n";
import { useConversationUpdatePreferences } from "./useConversationUpdatePreferences";

const props = defineProps<{
  initialFocus: ConversationEmailUpdatePreferenceFocus | undefined;
  initialSearch: string | undefined;
}>();
const { t } =
  useComponentI18n<ConversationUpdatePreferenceSettingsTranslations>(
    conversationUpdatePreferenceSettingsTranslations
  );
const {
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
} = useConversationUpdatePreferences({
  initialFocus: () => props.initialFocus,
  initialSearch: () => props.initialSearch,
});
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
