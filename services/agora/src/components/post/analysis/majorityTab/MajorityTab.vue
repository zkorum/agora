<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          title="What do most people agree on?"
        >
          <template #action-button>
            <div @click="switchTab()">
              <AnalysisActionButton :type="compactMode ? 'viewMore' : 'none'" />
            </div>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <ConsensusItem
          v-for="consensusItem in compactMode ? itemList.slice(0, 3) : itemList"
          :key="consensusItem.opinion"
          :opinion-slug-id="consensusItem.opinionSlugId"
          :description="consensusItem.opinion"
          :num-agree="consensusItem.numAgrees"
          :num-pass="0"
          :num-disagree="consensusItem.numDisagrees"
          :num-participants="consensusItem.numParticipants"
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
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { OpinionItem } from "src/shared/types/zod";

defineProps<{
  itemList: OpinionItem[];
  compactMode: boolean;
}>();

const currentTab = defineModel<ShortcutItem>();

function switchTab() {
  currentTab.value = "Majority";
}
</script>

<style lang="scss" scoped></style>
