<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('commonGroundTitle')"
        >
          <template #action-button>
            <AnalysisActionButton
              v-if="compactMode"
              type="viewMore"
              @action-click="switchTab()"
            />
            <AnalysisActionButton
              v-else
              type="informationIcon"
              @action-click="showCommonGroundInfo = true"
            />
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <EmptyStateMessage
          v-if="
            itemList.length === 0 || Object.keys(props.clusters).length <= 1
          "
          :message="t('noCommonGroundMessage')"
        />
        <ConsensusItem
          v-for="consensusItem in compactMode ? itemList.slice(0, 3) : itemList"
          v-else
          :key="consensusItem.opinion"
          :conversation-slug-id="props.conversationSlugId"
          :opinion-item="consensusItem"
          :opinion-item-for-visualizer="consensusItem"
          :cluster-labels="props.clusterLabels"
        />
      </template>
    </AnalysisSectionWrapper>

    <CommonGroundInformationDialog v-model="showCommonGroundInfo" />
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { ref } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import CommonGroundInformationDialog from "./CommonGroundInformationDialog.vue";
import ConsensusItem from "./ConsensusItem.vue";
import {
  type ConsensusTabTranslations,
  consensusTabTranslations,
} from "./ConsensusTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  itemList: AnalysisOpinionItem[];
  compactMode: boolean;
  clusters: Partial<PolisClusters>;
  clusterLabels: Partial<Record<PolisKey, string>>;
}>();

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<ConsensusTabTranslations>(
  consensusTabTranslations
);

const showCommonGroundInfo = ref(false);

function switchTab() {
  currentTab.value = "Common ground";
}
</script>

<style lang="scss" scoped></style>
