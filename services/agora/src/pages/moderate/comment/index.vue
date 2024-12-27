<template>
  <div class="container">
    <div v-if="hasExistingReport" class="title">
      Modify the existing comment report
    </div>

    <div v-if="!hasExistingReport" class="title">
      Submit a new comment report
    </div>

    <q-select
      v-model="moderationAction"
      :options="actionMapping"
      label="Moderation Action"
      emit-value
      map-options
    />

    <q-select
      v-model="moderationReason"
      :options="reasonMapping"
      label="Moderation Reason"
      emit-value
      map-options
    />

    <q-input
      v-model="moderationExplanation"
      label="Moderation Explanation (optional)"
    />

    <ZKButton label="Submit" color="primary" @click="clickedSubmit()" />
  </div>
</template>

<script setup lang="ts">
import { useBackendModerateApi } from "src/utils/api/moderation";
import { useRoute } from "vue-router";
import { onMounted, ref } from "vue";
import type {
  ModerationActionComments,
  ModerationReason,
} from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  moderationActionCommentsMapping,
  moderationReasonMapping,
} from "src/utils/component/moderation";

const { moderateComment, fetchCommentModeration } = useBackendModerateApi();

const route = useRoute();

const moderationAction = ref<ModerationActionComments>("lock");
const actionMapping = ref(moderationActionCommentsMapping);

const moderationReason = ref<ModerationReason>("off-topic");
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingReport = ref(false);

let commentSlugId: string | null = null;
if (typeof route.params.commentSlugId == "string") {
  commentSlugId = route.params.commentSlugId;
}

onMounted(async () => {
  const response = await fetchCommentModeration(commentSlugId);
  hasExistingReport.value = response.isModerated;
  if (response.isModerated) {
    moderationAction.value = response.moderationAction;
    moderationExplanation.value = response.moderationExplanation;
    moderationReason.value = response.moderationReason;
  }
});

async function clickedSubmit() {
  if (commentSlugId) {
    await moderateComment(
      commentSlugId,
      moderationAction.value,
      moderationReason.value,
      moderationExplanation.value
    );
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.title {
  font-size: 1.2rem;
}
</style>
