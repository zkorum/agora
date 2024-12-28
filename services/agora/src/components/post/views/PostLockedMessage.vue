<template>
  <div>
    <div class="container">
      <div class="title">
        <q-icon name="mdi-lock" class="lockIcon" size="1rem" />
        Post locked. New opinions cannot be posted.
      </div>

      <div>Reason: {{ moderationReasonName }}</div>

      <div>
        Explanation:
        <span v-if="moderationExplanation.length > 0">
          {{ moderationExplanation }}
        </span>

        <span v-if="moderationExplanation.length == 0">
          No reason had been provided
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModerationAction, ModerationReason } from "src/shared/types/zod";
import { moderationReasonMapping } from "src/utils/component/moderation";
import { ref, watch } from "vue";

const props = defineProps<{
  moderationAction: ModerationAction;
  moderationReason: ModerationReason;
  moderationExplanation: string;
}>();

const moderationReasonName = ref("");

loadModerationreason();

watch(
  () => props.moderationReason,
  () => {
    loadModerationreason();
  }
);

function loadModerationreason() {
  for (let i = 0; i < moderationReasonMapping.length; i++) {
    if (moderationReasonMapping[i].code == props.moderationReason) {
      moderationReasonName.value = moderationReasonMapping[i].name;
      break;
    }
  }
}
</script>

<style lang="css" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lockIcon {
  padding-bottom: 0.2rem;
  padding-right: 0.2rem;
}

.title {
  font-weight: bold;
}
</style>
