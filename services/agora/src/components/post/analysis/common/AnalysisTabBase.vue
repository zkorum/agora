<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="showStarInTitle"
          :title="title"
          :show-choice="showChoice"
        />
      </template>

      <template #body>
        <ConsensusItem
          v-for="consensusItem in compactMode ? itemList.slice(0, 3) : itemList"
          :id="consensusItem.id"
          :key="consensusItem.description"
          :description="consensusItem.description"
          :num-agree="consensusItem.totalNumAgree"
          :num-pass="consensusItem.totalNumPass"
          :num-disagree="consensusItem.totalNumDisagree"
          :num-no-vote="consensusItem.totalNumNoVote"
        />
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "./AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "./AnalysisTitleHeader.vue";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import { OpinionConsensusItem } from "src/utils/component/analysis/analysisTypes";

defineProps<{
  title: string;
  itemList: OpinionConsensusItem[];
  showChoice: "infoButton" | "viewMore" | "whatIsThis";
  showStarInTitle: boolean;
  compactMode: boolean;
}>();
</script>

<style lang="scss" scoped></style>
