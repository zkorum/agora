<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('divisiveTitle')"
        >
          <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
          <!-- Tab switching should be keyboard accessible for users with motor disabilities -->
          <template #action-button>
            <div @click="switchTab()">
              <AnalysisActionButton :type="compactMode ? 'viewMore' : 'none'" />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <EmptyStateMessage
          v-if="
            itemList.length === 0 || Object.keys(props.clusters).length <= 1
          "
          :message="t('noDivisiveOpinionsMessage')"
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

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import {
  type DivisiveTabTranslations,
  divisiveTabTranslations,
} from "./DivisiveTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  itemList: AnalysisOpinionItem[];
  compactMode: boolean;
  clusters: Partial<PolisClusters>;
  clusterLabels: Partial<Record<PolisKey, string>>;
}>();

const currentTab = defineModel<ShortcutItem>();

const { t } = useComponentI18n<DivisiveTabTranslations>(
  divisiveTabTranslations
);

function switchTab() {
  currentTab.value = "Divisive";
}
</script>

<style lang="scss" scoped></style>
