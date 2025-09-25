<template>
  <AsyncStateHandler :query="analysisQuery" :config="asyncStateConfig">
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Common ground'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="analysisQuery.data.value?.consensus || []"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <DivisiveTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="analysisQuery.data.value?.controversial || []"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Groups'"
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </AsyncStateHandler>
</template>

<script setup lang="ts">
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { ref, computed } from "vue";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  analysisPageTranslations,
  type AnalysisPageTranslations,
} from "./AnalysisPage.i18n";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { OpinionItem, PolisClusters } from "src/shared/types/zod";

type AnalysisData = {
  consensus: OpinionItem[];
  controversial: OpinionItem[];
  polisClusters: Partial<PolisClusters>;
};

const props = defineProps<{
  participantCount: number;
  conversationSlugId: string;
  analysisQuery: UseQueryReturnType<AnalysisData, Error>;
}>();

const { t } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);

// Get invalidation utilities
const { invalidateAnalysis } = useInvalidateCommentQueries();

const currentTab = ref<ShortcutItem>("Summary");

// Use the passed-in analysis query instead of creating our own
const analysisQuery = props.analysisQuery;

const asyncStateConfig = {
  loading: {
    text: t("loadingAnalysis"),
  },
  retrying: {
    text: t("retryingAnalysis"),
  },
  error: {
    title: t("analysisErrorTitle"),
    message: t("analysisErrorMessage"),
    retryButtonText: t("retryAnalysis"),
  },
  empty: {
    text: t("noAnalysisData"),
  },
};

function refreshData(): void {
  // Use utility function to invalidate analysis queries
  // This ensures fresh network requests regardless of staleTime
  invalidateAnalysis(props.conversationSlugId);
}

defineExpose({
  refreshData,
  isLoading: computed(
    () => analysisQuery.isPending.value || analysisQuery.isRefetching.value
  ),
});
</script>

<style lang="scss" scoped>
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 10rem;
  color: #333238;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}
</style>
