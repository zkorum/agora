<template>
  <div>
    <AnalysisTitleHeader
      title="What is most divisive?"
      :show-info-button="false"
      :show-view-more="true"
      :show-what-is-this="false"
    />

    <div
      v-for="consensusItem in consensusItemList"
      :key="consensusItem.description"
    >
      {{ consensusItem.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
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
