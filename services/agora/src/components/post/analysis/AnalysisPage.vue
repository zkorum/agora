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
import { ref } from "vue";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  analysisPageTranslations,
  type AnalysisPageTranslations,
} from "./AnalysisPage.i18n";

const props = defineProps<{
  participantCount: number;
  conversationSlugId: string;
}>();

const { t } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);

const currentTab = ref<ShortcutItem>("Summary");

const analysisQuery = useAnalysisQuery({
  conversationSlugId: props.conversationSlugId,
  enabled: true,
});

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

async function refreshData(): Promise<void> {
  await analysisQuery.refetch();
}

defineExpose({
  refreshData,
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
