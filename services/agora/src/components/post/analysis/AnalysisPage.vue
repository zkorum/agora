<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar @clicked-shortcut="handleShortcut" />

      <MeTab />

      <ConsensusTab />

      <DivisivenessTab />

      <OpinionGroupTab
        v-model:model-value="currentClusterTab"
        :polis="props.polis"
        :total-participant-count="props.participantCount"
        @selected-cluster="(value: PolisKey) => toggleClusterSelection(value)"
      />

      <CommentConsensusSummary
        v-if="currentAiSummary"
        :summary="currentAiSummary"
        :selected-cluster-key="currentClusterTab"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis, PolisKey } from "src/shared/types/zod";
import { computed, ref } from "vue";
import CommentConsensusSummary from "./CommentConsensusSummary.vue";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import MeTab from "./meTab/meTab.vue";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisivenessTab from "./divisivenessTab/DivisivenessTab.vue";

const props = defineProps<{
  polis: ExtendedConversationPolis;
  participantCount: number;
}>();

const currentClusterTab = ref<PolisKey | "all">("all");

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
  padding-bottom: 10rem;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
