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
        :opinion-slug-id="comment.opinionSlugId"
        :description="comment.opinion"
        :num-agree="getActiveVotes(comment).numAgrees"
        :num-pass="0"
        :num-disagree="getActiveVotes(comment).numDisagrees"
        :num-participants="getActiveVotes(comment).numUsers"
        :opinion-item="comment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { OpinionItem } from "src/shared/types/zod";
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";

const props = defineProps<{
  conversationSlugId: string;
  itemList: OpinionItem[];
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

function getActiveVotes(comment: OpinionItem) {
  const currentClusterStats = comment.clustersStats.find(
    (cv) => cv.key === props.currentClusterTab
  );
  if (displayMode.value === "current") {
    return (
      currentClusterStats || {
        numAgrees: 0,
        numDisagrees: 0,
        // numPass: 0,
        numUsers: 0,
      }
    );
  } else {
    return {
      numAgrees:
        comment.numAgrees -
        (currentClusterStats !== undefined ? currentClusterStats.numAgrees : 0),
      numDisagrees:
        comment.numDisagrees -
        (currentClusterStats !== undefined
          ? currentClusterStats.numDisagrees
          : 0),
      numUsers:
        comment.numParticipants -
        (currentClusterStats !== undefined ? currentClusterStats.numUsers : 0),
    };
  }
}

const currentModeName = computed(() => {
  return displayMode.value === "current" ? "This group" : "All others";
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
