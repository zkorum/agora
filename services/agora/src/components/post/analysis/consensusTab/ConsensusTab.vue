<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          title="Common ground: What do people across all groups agree on?"
          :show-choice="'viewMore'"
        />
      </template>

      <template #body>
        <div
          v-for="consensusItem in consensusItemList"
          :key="consensusItem.description"
        >
          {{ consensusItem.description }}
        </div>
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";

interface ConsensusItem {
  description: string;
  numAgree: number;
  numDisagree: number;
}

const consensusItemList: ConsensusItem[] = [
  {
    description: "Test1",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    description: "Test2",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    description: "Test3",
    numAgree: 100,
    numDisagree: 20,
  },
];
</script>

<style lang="scss" scoped></style>
