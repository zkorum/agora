<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          title="What is most divisive?"
          :show-choice="'viewMore'"
        />
      </template>

      <template #body>
        <div v-for="consensusItem in consensusItemList" :key="consensusItem.id">
          {{ consensusItem.description }}
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

const consensusItemList: ConsensusItemData[] = [
  {
    id: 1,
    description: "Test1",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 2,
    description: "Test2",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 3,
    description: "Test3",
    numAgree: 100,
    numDisagree: 20,
  },
];
</script>

<style lang="scss" scoped></style>
