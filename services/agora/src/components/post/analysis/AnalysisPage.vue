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
import { OpinionConsensusItem } from "src/utils/component/analysis/analysisTypes";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const currentTab = ref<ShortcutItem>("Summary");

const consensusItemList = ref<OpinionConsensusItem[]>([
  {
    id: 1,
    description:
      "Education is fundamental for personal and societal development",
    totalNumAgree: 150,
    totalNumPass: 25,
    totalNumDisagree: 15,
    totalNumNoVote: 10,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 85,
        numPass: 15,
        numDisagree: 8,
        numNoVote: 5,
      },
      {
        clusterKey: "1",
        numAgree: 65,
        numPass: 10,
        numDisagree: 7,
        numNoVote: 5,
      },
    ],
  },
  {
    id: 2,
    description: "Healthcare access should be improved for everyone",
    totalNumAgree: 120,
    totalNumPass: 30,
    totalNumDisagree: 20,
    totalNumNoVote: 8,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 70,
        numPass: 18,
        numDisagree: 12,
        numNoVote: 4,
      },
      {
        clusterKey: "1",
        numAgree: 50,
        numPass: 12,
        numDisagree: 8,
        numNoVote: 4,
      },
    ],
  },
  {
    id: 3,
    description: "Technology should be used responsibly",
    totalNumAgree: 95,
    totalNumPass: 20,
    totalNumDisagree: 12,
    totalNumNoVote: 6,
    belongsToClusters: ["0"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 95,
        numPass: 20,
        numDisagree: 12,
        numNoVote: 6,
      },
    ],
  },
]);

const majorityItemList = ref<OpinionConsensusItem[]>([
  {
    id: 1,
    description: "Most people agree that education is important",
    totalNumAgree: 180,
    totalNumPass: 15,
    totalNumDisagree: 10,
    totalNumNoVote: 4,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 100,
        numPass: 8,
        numDisagree: 5,
        numNoVote: 2,
      },
      {
        clusterKey: "1",
        numAgree: 80,
        numPass: 7,
        numDisagree: 5,
        numNoVote: 2,
      },
    ],
  },
  {
    id: 2,
    description: "Healthcare should be accessible to everyone",
    totalNumAgree: 160,
    totalNumPass: 20,
    totalNumDisagree: 15,
    totalNumNoVote: 8,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 90,
        numPass: 12,
        numDisagree: 8,
        numNoVote: 4,
      },
      {
        clusterKey: "1",
        numAgree: 70,
        numPass: 8,
        numDisagree: 7,
        numNoVote: 4,
      },
    ],
  },
  {
    id: 3,
    description: "Environmental protection is a priority",
    totalNumAgree: 140,
    totalNumPass: 25,
    totalNumDisagree: 20,
    totalNumNoVote: 10,
    belongsToClusters: ["1"],
    clusterVotes: [
      {
        clusterKey: "1",
        numAgree: 140,
        numPass: 25,
        numDisagree: 20,
        numNoVote: 10,
      },
    ],
  },
]);

const divisiveItemList = ref<OpinionConsensusItem[]>([
  {
    id: 1,
    description: "Tax policy should prioritize economic growth",
    totalNumAgree: 85,
    totalNumPass: 30,
    totalNumDisagree: 75,
    totalNumNoVote: 15,
    belongsToClusters: ["0"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 85,
        numPass: 30,
        numDisagree: 75,
        numNoVote: 15,
      },
    ],
  },
  {
    id: 2,
    description: "Government regulation of businesses should be increased",
    totalNumAgree: 70,
    totalNumPass: 25,
    totalNumDisagree: 90,
    totalNumNoVote: 20,
    belongsToClusters: ["1"],
    clusterVotes: [
      {
        clusterKey: "1",
        numAgree: 70,
        numPass: 25,
        numDisagree: 90,
        numNoVote: 20,
      },
    ],
  },
  {
    id: 3,
    description: "Social media has a positive impact on society",
    totalNumAgree: 60,
    totalNumPass: 40,
    totalNumDisagree: 80,
    totalNumNoVote: 25,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 35,
        numPass: 20,
        numDisagree: 45,
        numNoVote: 12,
      },
      {
        clusterKey: "1",
        numAgree: 25,
        numPass: 20,
        numDisagree: 35,
        numNoVote: 13,
      },
    ],
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
