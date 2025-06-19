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
        <ConsensusItem
          v-for="consensusItem in consensusItemList"
          :key="consensusItem.description"
          :consensus-item="consensusItem"
        />
      </template>
    </AnalysisSectionWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import ConsensusItem from "./ConsensusItem.vue";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

const dummyDescription =
  " Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he in forfeited furniture sweetness he arranging. Me tedious so to behaved written account ferrars moments. Too objection for elsewhere her preferred allowance her. Marianne shutters mr steepest to me. Up mr ignorant produced distance although is sociable blessing. Ham whom call all lain like.";

const consensusItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description:
      "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he",
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 2,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
  },
  {
    id: 3,
    description: dummyDescription,
    numAgree: 100,
    numDisagree: 20,
  },
]);
</script>

<style lang="scss" scoped></style>
