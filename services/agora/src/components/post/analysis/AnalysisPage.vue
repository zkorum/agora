<template>
  <div class="container">
    <ShortcutBar @clicked-shortcut="handleShortcut" />

    <CommentClusterGraph
      :clusters="props.polis.clusters"
      :total-participant-count="props.participantCount"
      :current-cluster-tab="currentClusterTab"
      @selected-cluster="(value: PolisKey) => toggleClusterSelection(value)"
    />

    <ClusterTabs
      v-model="currentClusterTab"
      :cluster-metadata-list="props.polis.clusters"
    />

    <CommentConsensusSummary
      v-if="currentAiSummary"
      :summary="currentAiSummary"
      :selected-cluster-key="currentSelectedClusterKey"
    />
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import { computed, ref } from "vue";
import CommentConsensusSummary from "./CommentConsensusSummary.vue";
import CommentClusterGraph from "./cluster/CommentClusterGraph.vue";
import ClusterTabs from "./cluster/ClusterTabs.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const currentClusterTab = ref<PolisKey | "all">("all");

const currentSelectedClusterKey = computed(() => {
  if (currentClusterTab.value !== "all") {
    return currentClusterTab.value;
  }
  return undefined;
});

const currentAiSummary = computed(() => {
  if (currentClusterTab.value === "all") {
    return props.polis.aiSummary;
  } else if (
    typeof currentClusterTab.value === "string" &&
    parseInt(currentClusterTab.value) in props.polis.clusters
  ) {
    return props.polis.clusters[parseInt(currentClusterTab.value)].aiSummary;
  }
  return undefined;
});

function toggleClusterSelection(clusterKey: PolisKey) {
  if (currentClusterTab.value == clusterKey) {
    currentClusterTab.value = "all";
  } else {
    currentClusterTab.value = clusterKey;
  }
}

function handleShortcut(shortcutName: ShortcutItem) {
  console.log("Shortcut clicked:", shortcutName);
}
</script>

<style lang="scss" scoped>
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
}
</style>
