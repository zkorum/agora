<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <MeTab />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Consensus'"
        class="tabComponent"
      >
        <AnalysisTabBase
          title="Common ground: What do people across all groups agree on?"
          :item-list="consensusItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
          :compact-mode="false"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Majority'"
        class="tabComponent"
      >
        <AnalysisTabBase
          title="What do most people agree on?"
          :item-list="majorityItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
          :compact-mode="false"
        />
      </div>

      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <AnalysisTabBase
          title="What is most divisive?"
          :item-list="divisiveItemList"
          show-choice="viewMore"
          :show-star-in-title="false"
          :compact-mode="false"
        />
      </div>

      <div
        v-if="
          currentTab === 'Summary' ||
          currentTab === 'Opinion Groups' ||
          currentTab === 'Me'
        "
        class="tabComponent"
      >
        <OpinionGroupTab
          :polis="props.polis"
          :total-participant-count="props.participantCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis } from "src/shared/types/zod";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import MeTab from "./meTab/meTab.vue";
import AnalysisTabBase from "./common/AnalysisTabBase.vue";
import { ref } from "vue";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const currentTab = ref<ShortcutItem>("Summary");

const dummyDescription =
  "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he in forfeited furniture sweetness he arranging. Me tedious so to behaved written account ferrars moments.";

const consensusItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description:
      "Bringing unlocked me an striking ye perceive. Mr by wound hours oh happy. Me in resolution pianoforte continuing we. Most my no spot felt by no. He he",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 2,
    description: dummyDescription,
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 3,
    description: dummyDescription,
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
]);

const majorityItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description: "Most people agree that education is important",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 2,
    description: "Healthcare should be accessible to everyone",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 3,
    description: "Environmental protection is a priority",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
]);

const divisiveItemList = ref<ConsensusItemData[]>([
  {
    id: 1,
    description: "Tax policy should prioritize economic growth",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 2,
    description: "Government regulation of businesses should be increased",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
  {
    id: 3,
    description: "Social media has a positive impact on society",
    numAgree: 75,
    numPass: 15,
    numDisagree: 10,
    numNoVote: 4,
  },
]);
</script>

<style lang="scss" scoped>
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 10rem;
  color: #333238;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}
</style>
