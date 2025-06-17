<template>
  <div>
    <div class="container flexStyle">
      <ShortcutBar @clicked-shortcut="handleShortcut" />

      <MeTab />

      <ConsensusTab />

      <DivisivenessTab />

      <OpinionGroupTab
        :polis="props.polis"
        :total-participant-count="props.participantCount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExtendedConversationPolis } from "src/shared/types/zod";
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
  margin-bottom: 5rem;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
