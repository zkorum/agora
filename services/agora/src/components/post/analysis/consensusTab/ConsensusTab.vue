<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('commonGroundTitle')"
        >
          <template #action-button>
            <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
            <!-- Tab switching should be keyboard accessible for users with motor disabilities -->
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
          :message="t('noCommonGroundMessage')"
        />
        <ConsensusItem
          v-for="consensusItem in compactMode ? itemList.slice(0, 3) : itemList"
          v-else
          :key="consensusItem.opinion"
          :conversation-slug-id="props.conversationSlugId"
          :opinion-item="consensusItem"
          :opinion-item-for-visualizer="consensusItem"
        />
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import ConsensusItem from "./ConsensusItem.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { OpinionItem, PolisClusters } from "src/shared/types/zod";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  consensusTabTranslations,
  type ConsensusTabTranslations,
} from "./ConsensusTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  itemList: OpinionItem[];
  compactMode: boolean;
  clusters: Partial<PolisClusters>;
}>();

const currentTab = defineModel<ShortcutItem>();

const { t } = useComponentI18n<ConsensusTabTranslations>(
  consensusTabTranslations
);

function switchTab() {
  currentTab.value = "Common ground";
}
</script>

<style lang="scss" scoped></style>
