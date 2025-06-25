<template>
  <div class="opinion-group-comments">
    <div class="header-flex-style">
      <h2 class="title">
        Opinions <span class="count">{{ filteredComments.length }}</span>
      </h2>

      <div class="group-selector">
        <q-btn
          flat
          round
          dense
          icon="mdi-chevron-left"
          @click="navigateToPreviousMode"
        />
        <span class="group-name">{{ currentModeName }}</span>
        <q-btn
          flat
          round
          dense
          icon="mdi-chevron-right"
          @click="navigateToNextMode"
        />
      </div>
    </div>

    <div v-if="filteredComments.length === 0" class="no-comments">
      No comments available for this group.
    </div>

    <div v-else>
      <ConsensusItem
        v-for="comment in filteredComments"
        :id="comment.id"
        :key="comment.id"
        :description="comment.description"
        :num-agree="getActiveVotes(comment).numAgree"
        :num-pass="getActiveVotes(comment).numPass"
        :num-disagree="getActiveVotes(comment).numDisagree"
        :num-no-vote="getActiveVotes(comment).numNoVote"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import { OpinionConsensusItem } from "src/utils/component/analysis/analysisTypes";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";

const props = defineProps<{
  currentClusterTab: PolisKey;
  polis: ExtendedConversationPolis;
}>();

const displayMode = ref<"current" | "others">("current");

watch(
  () => props.currentClusterTab,
  () => {
    displayMode.value = "current";
  }
);

const mockComments = ref<OpinionConsensusItem[]>([
  {
    id: 1,
    description: "Time to tax the super rich.",
    totalNumAgree: 40,
    totalNumPass: 23,
    totalNumDisagree: 22,
    totalNumNoVote: 10,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 15,
        numPass: 15,
        numDisagree: 10,
        numNoVote: 4,
      },
      {
        clusterKey: "1",
        numAgree: 25,
        numPass: 8,
        numDisagree: 12,
        numNoVote: 6,
      },
    ],
  },
  {
    id: 2,
    description:
      "In response to the comment that we should tax the super rich, I think we should specify that we should tax wealth over income. This would be more effective at addressing inequality and ensuring that those with significant assets contribute their fair share to society.",
    totalNumAgree: 85,
    totalNumPass: 45,
    totalNumDisagree: 15,
    totalNumNoVote: 30,
    belongsToClusters: ["0"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 75,
        numPass: 35,
        numDisagree: 10,
        numNoVote: 24,
      },
      {
        clusterKey: "1",
        numAgree: 10,
        numPass: 10,
        numDisagree: 5,
        numNoVote: 6,
      },
    ],
  },
  {
    id: 3,
    description:
      "Europe should be prepared for a future without US support, being self-sufficient is a good thing. That said, Europe also needs to increase defense spending and coordinate better between member states to ensure collective security in an increasingly unstable world.",
    totalNumAgree: 55,
    totalNumPass: 35,
    totalNumDisagree: 124,
    totalNumNoVote: 55,
    belongsToClusters: ["1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 20,
        numPass: 10,
        numDisagree: 20,
        numNoVote: 10,
      },
      {
        clusterKey: "1",
        numAgree: 35,
        numPass: 25,
        numDisagree: 104,
        numNoVote: 45,
      },
    ],
  },
  {
    id: 4,
    description: "Time to tax the super rich 1.",
    totalNumAgree: 245,
    totalNumPass: 125,
    totalNumDisagree: 30,
    totalNumNoVote: 64,
    belongsToClusters: ["0"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 225,
        numPass: 115,
        numDisagree: 20,
        numNoVote: 54,
      },
      {
        clusterKey: "1",
        numAgree: 20,
        numPass: 10,
        numDisagree: 10,
        numNoVote: 10,
      },
    ],
  },
  {
    id: 5,
    description: "Time to tax the super rich 2.",
    totalNumAgree: 85,
    totalNumPass: 25,
    totalNumDisagree: 15,
    totalNumNoVote: 10,
    belongsToClusters: ["0", "1"],
    clusterVotes: [
      {
        clusterKey: "0",
        numAgree: 75,
        numPass: 15,
        numDisagree: 10,
        numNoVote: 4,
      },
      {
        clusterKey: "1",
        numAgree: 10,
        numPass: 10,
        numDisagree: 5,
        numNoVote: 6,
      },
    ],
  },
]);

const filteredComments = computed(() => {
  return mockComments.value.filter((comment) =>
    comment.belongsToClusters.includes(props.currentClusterTab)
  );
});

const getActiveVotes = (comment: OpinionConsensusItem) => {
  if (displayMode.value === "current") {
    const currentClusterVotes = comment.clusterVotes.find(
      (cv) => cv.clusterKey === props.currentClusterTab
    );
    return (
      currentClusterVotes || {
        numAgree: 0,
        numPass: 0,
        numDisagree: 0,
        numNoVote: 0,
      }
    );
  } else {
    return comment.clusterVotes
      .filter((cv) => cv.clusterKey !== props.currentClusterTab)
      .reduce(
        (acc, cv) => ({
          numAgree: acc.numAgree + cv.numAgree,
          numPass: acc.numPass + cv.numPass,
          numDisagree: acc.numDisagree + cv.numDisagree,
          numNoVote: acc.numNoVote + cv.numNoVote,
        }),
        { numAgree: 0, numPass: 0, numDisagree: 0, numNoVote: 0 }
      );
  }
};

const currentModeName = computed(() => {
  return displayMode.value === "current" ? "This group" : "All other groups";
});

const toggleMode = () => {
  displayMode.value = displayMode.value === "current" ? "others" : "current";
};

const navigateToPreviousMode = toggleMode;
const navigateToNextMode = toggleMode;
</script>

<style lang="scss" scoped>
.opinion-group-comments {
  padding: 1rem 0;
}

.title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  color: #434149;
}

.count {
  font-size: 0.9rem;
  color: #9a97a4;
  margin-left: 0.5rem;
}

.group-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.no-comments {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.header-flex-style {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}
</style>
