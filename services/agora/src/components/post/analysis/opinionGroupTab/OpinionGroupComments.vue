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
          @click="navigateToPreviousGroup"
        />
        <span class="group-name">{{ currentGroupName }}</span>
        <q-btn
          flat
          round
          dense
          icon="mdi-chevron-right"
          @click="navigateToNextGroup"
        />
      </div>
    </div>

    <div v-if="filteredComments.length === 0" class="no-comments">
      No comments available for this group.
    </div>

    <div v-else>
      <ConsensusItem
        v-for="comment in filteredComments"
        :key="comment.id"
        :consensus-item="comment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import { ConsensusItemData } from "src/utils/component/analysis/analysisTypes";
import { formatClusterLabel } from "src/utils/component/opinion";
import ConsensusItem from "../consensusTab/ConsensusItem.vue";

interface Comment extends ConsensusItemData {
  clusterKey: PolisKey;
}

const emit = defineEmits<{
  (e: "update:currentClusterTab", value: PolisKey): void;
}>();

const props = defineProps<{
  currentClusterTab: PolisKey;
  polis: ExtendedConversationPolis;
}>();

const mockComments = ref<Comment[]>([
  {
    id: 1,
    description: "Time to tax the super rich.",
    numAgree: 75,
    numDisagree: 10,
    clusterKey: "1",
  },
  {
    id: 2,
    description:
      "In response to the comment that we should tax the super rich, I think we should specify that we should tax wealth over income. This would be more effective at addressing inequality and ensuring that those with significant assets contribute their fair share to society.",
    numAgree: 65,
    numDisagree: 15,
    clusterKey: "0",
  },
  {
    id: 3,
    description:
      "Europe should be prepared for a future without US support, being self-sufficient is a good thing. That said, Europe also needs to increase defense spending and coordinate better between member states to ensure collective security in an increasingly unstable world.",
    numAgree: 45,
    numDisagree: 45,
    clusterKey: "1",
  },
  {
    id: 4,
    description: "Time to tax the super rich 1.",
    numAgree: 80,
    numDisagree: 15,
    clusterKey: "0",
  },
  {
    id: 5,
    description: "Time to tax the super rich 2.",
    numAgree: 70,
    numDisagree: 20,
    clusterKey: "0",
  },
]);

const filteredComments = computed(() => {
  return mockComments.value.filter(
    (comment) => comment.clusterKey === props.currentClusterTab
  );
});

const currentGroupName = computed(() => {
  const clusterIndex = parseInt(props.currentClusterTab);
  return formatClusterLabel(
    props.currentClusterTab as PolisKey,
    true,
    props.polis.clusters[clusterIndex]?.aiLabel
  );
});

const navigateToPreviousGroup = () => {
  const currentIndex = parseInt(props.currentClusterTab);

  // If at the first cluster, go to the last cluster
  if (currentIndex === 0) {
    const lastClusterIndex = props.polis.clusters.length - 1;
    if (lastClusterIndex >= 0) {
      emit("update:currentClusterTab", lastClusterIndex.toString() as PolisKey);
    }
  } else {
    // Otherwise go to the previous cluster
    emit("update:currentClusterTab", (currentIndex - 1).toString() as PolisKey);
  }
};

const navigateToNextGroup = () => {
  const currentIndex = parseInt(props.currentClusterTab);

  // If at the last cluster, go to the first cluster
  if (currentIndex === props.polis.clusters.length - 1) {
    emit("update:currentClusterTab", "0");
  } else {
    // Otherwise go to the next cluster
    emit("update:currentClusterTab", (currentIndex + 1).toString() as PolisKey);
  }
};
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
