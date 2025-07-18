<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader :show-star-in-title="false" title="Common ground">
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
          message="No common ground found yet."
        />
        <ConsensusItem
          v-for="consensusItem in compactMode ? itemList.slice(0, 3) : itemList"
          v-else
          :key="consensusItem.opinion"
          :conversation-slug-id="props.conversationSlugId"
          :opinion-item="consensusItem"
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
import type { OpinionItem } from "src/shared/types/zod";

const props = defineProps<{
  conversationSlugId: string;
  itemList: OpinionItem[];
  compactMode: boolean;
}>();

const currentTab = defineModel<ShortcutItem>();

function switchTab() {
  currentTab.value = "Common ground";
}
</script>

<style lang="scss" scoped></style>
