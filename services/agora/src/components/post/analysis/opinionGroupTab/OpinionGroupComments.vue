<template>
  <div class="opinion-group-comments">
    <div class="header-flex-style">
      <h2 class="title">
        Opinions <span class="count">{{ itemList.length }}</span>
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

    <div v-if="itemList.length === 0" class="no-comments">
      No opinions available for this group.
    </div>

    <div v-else>
      <ConsensusItem
        v-for="comment in itemList"
        :key="comment.opinionSlugId"
        :conversation-slug-id="props.conversationSlugId"
        :opinion-item="comment"
        :opinion-item-for-visualizer="getModifiedOpinionItem(comment)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OpinionItem } from "src/shared/types/zod";
import type { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";

const props = defineProps<{
  conversationSlugId: string;
  itemList: OpinionItem[];
  currentClusterTab: PolisKey;
  polis: ExtendedConversationPolis;
  hasUngroupedParticipants: boolean;
}>();

const displayMode = ref<"current" | "all_other_groups" | "all_others">(
  "current"
);

watch(
  () => props.currentClusterTab,
  () => {
    displayMode.value = "current";
  }
);

function getActiveVotes(comment: OpinionItem) {
  const currentClusterStats = comment.clustersStats.find(
    (cv) => cv.key === props.currentClusterTab
  );
  const allOthersClustersStats = comment.clustersStats.filter(
    (clusterStats) => clusterStats.key !== props.currentClusterTab
  );
  switch (displayMode.value) {
    case "current":
      return (
        currentClusterStats || {
          numAgrees: 0,
          numDisagrees: 0,
          numPasses: 0,
          numUsers: 0,
        }
      );
    case "all_other_groups":
      return {
        numAgrees: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numAgrees,
          0
        ),
        numDisagrees: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numDisagrees,
          0
        ),
        numPasses: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numPasses,
          0
        ),
        numUsers: Object.values(allOthersClustersStats).reduce(
          (sum, clusterStats) => sum + clusterStats.numUsers,
          0
        ),
      };
    case "all_others":
      return {
        numAgrees:
          comment.numAgrees -
          (currentClusterStats !== undefined
            ? currentClusterStats.numAgrees
            : 0),
        numDisagrees:
          comment.numDisagrees -
          (currentClusterStats !== undefined
            ? currentClusterStats.numDisagrees
            : 0),
        numPasses:
          comment.numPasses -
          (currentClusterStats !== undefined
            ? currentClusterStats.numPasses
            : 0),
        numUsers:
          comment.numParticipants -
          (currentClusterStats !== undefined
            ? currentClusterStats.numUsers
            : 0),
      };
  }
}

function getModifiedOpinionItem(comment: OpinionItem): OpinionItem {
  const activeVotes = getActiveVotes(comment);
  return {
    ...comment,
    numAgrees: activeVotes.numAgrees,
    numDisagrees: activeVotes.numDisagrees,
    numPasses: activeVotes.numPasses,
    numParticipants: activeVotes.numUsers,
  };
}

const currentModeName = computed(() => {
  return displayMode.value === "current"
    ? "This group"
    : displayMode.value === "all_others"
      ? "All others"
      : "All other groups";
});

const toggleNextMode = () => {
  if (props.hasUngroupedParticipants) {
    displayMode.value =
      displayMode.value === "current"
        ? "all_other_groups"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  } else {
    // all_other_groups will never be displayed
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  }
};

const togglePreviousMode = () => {
  if (props.hasUngroupedParticipants) {
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "current"
          : "all_other_groups";
  } else {
    // all_other_groups will never be displayed
    displayMode.value =
      displayMode.value === "current"
        ? "all_others"
        : displayMode.value === "all_other_groups"
          ? "all_others"
          : "current";
  }
};

const navigateToPreviousMode = togglePreviousMode;
const navigateToNextMode = toggleNextMode;
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
