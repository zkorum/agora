<template>
  <div>
    <div class="container moderationFont">
      <div class="coreMessage">
        <div class="title">
          <div>
            <q-icon name="mdi-lock" class="lockIcon" size="1rem" />
          </div>
          <div>
            Post locked as "{{ moderationReasonName }}". New opinions cannot be
            posted.
          </div>
        </div>

        <div>
          <span v-if="moderationProperty.moderationExplanation.length > 0">
            "{{ moderationProperty.moderationExplanation }}"
          </span>

          <span v-if="moderationProperty.moderationExplanation.length == 0">
            No explanation had been provided
          </span>
        </div>
      </div>

      <ModerationTime :created-at="moderationProperty.createdAt" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModerationPropertiesPosts } from "src/shared/types/zod";
import { moderationReasonMapping } from "src/utils/component/moderation";
import { ref, watch } from "vue";
import ModerationTime from "./moderation/ModerationTime.vue";

const props = defineProps<{
  moderationProperty: ModerationPropertiesPosts;
}>();

const moderationReasonName = ref("");

loadModerationreason();

watch(
  () => props.moderationProperty,
  () => {
    loadModerationreason();
  }
);

function loadModerationreason() {
  for (let i = 0; i < moderationReasonMapping.length; i++) {
    if (
      moderationReasonMapping[i].value ==
      props.moderationProperty.moderationReason
    ) {
      moderationReasonName.value = moderationReasonMapping[i].label;
      break;
    }
  }
}
</script>

<style lang="css" scoped>
.container {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
}

.lockIcon {
  padding-bottom: 0.2rem;
  padding-right: 0.2rem;
}

.moderationFont {
  font-weight: 400;
  color: #6d6a74;
}

.coreMessage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
