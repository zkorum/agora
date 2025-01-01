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

    <ZKButton
      v-if="hasExistingReport"
      label="Withdraw Report"
      color="secondary"
      text-color="primary"
      @click="clickedCancel()"
    />
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

const {
  moderateComment,
  fetchCommentModeration,
  cancelModerationCommentReport,
} = useBackendModerateApi();

const route = useRoute();

const DEFAULT_MODERATION_ACTION = "lock";
const moderationAction = ref<ModerationActionComments>(
  DEFAULT_MODERATION_ACTION
);
const actionMapping = ref(moderationActionCommentsMapping);

const DEFAULT_MODERATION_REASON = "misleading";
const moderationReason = ref<ModerationReason>(DEFAULT_MODERATION_REASON);
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingReport = ref(false);

let commentSlugId: string | null = null;
if (typeof route.params.commentSlugId == "string") {
  commentSlugId = route.params.commentSlugId;
}

onMounted(async () => {
  await initializeData();
});

async function initializeData() {
  if (commentSlugId != null) {
    const response = await fetchCommentModeration(commentSlugId);
    hasExistingReport.value = response.moderationStatus == "moderated";
    if (response.moderationStatus == "moderated") {
      moderationAction.value = response.moderationAction;
      moderationExplanation.value = response.moderationExplanation;
      moderationReason.value = response.moderationReason;
    } else {
      moderationAction.value = DEFAULT_MODERATION_ACTION;
      moderationExplanation.value = "";
      moderationReason.value = DEFAULT_MODERATION_REASON;
    }
  } else {
    console.log("Missing comment slug ID");
  }
}

async function clickedCancel() {
  if (commentSlugId) {
    await cancelModerationCommentReport(commentSlugId);
    initializeData();
  } else {
    console.log("Missing comment slug ID");
  }
}

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
