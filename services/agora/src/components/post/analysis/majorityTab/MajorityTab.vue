<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('majorityTitle')"
        >
          <template #action-button>
            <div @click="switchTab()">
              <AnalysisActionButton :type="compactMode ? 'viewMore' : 'none'" />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <EmptyStateMessage
          v-if="itemList.length === 0"
          :message="t('noMajorityOpinionsMessage')"
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
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { OpinionItem } from "src/shared/types/zod";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  majorityTabTranslations,
  type MajorityTabTranslations,
} from "./MajorityTab.i18n";

const props = defineProps<{
  conversationSlugId: string;
  itemList: OpinionItem[];
  compactMode: boolean;
}>();

const currentTab = defineModel<ShortcutItem>();

const { t } = useComponentI18n<MajorityTabTranslations>(
  majorityTabTranslations
);

function switchTab() {
  currentTab.value = "Majority";
}
</script>

<style lang="scss" scoped></style>
