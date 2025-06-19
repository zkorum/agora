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
          v-for="consensusItem in itemList"
          :key="consensusItem.description"
          :consensus-item="consensusItem"
        />
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "./AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "./AnalysisTitleHeader.vue";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

defineProps<{
  title: string;
  itemList: ConsensusItemData[];
  showChoice: "infoButton" | "viewMore" | "whatIsThis";
  showStarInTitle: boolean;
}>();
</script>

<style lang="scss" scoped></style>
