<template>
  <div class="container">
    <div v-if="hasExistingReport" class="title">
      Modify the existing post report
    </div>

    <div v-if="!hasExistingReport" class="title">Submit a new post report</div>

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
  ModerationActionPosts,
  ModerationReason,
} from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  moderationActionPostsMapping,
  moderationReasonMapping,
} from "src/utils/component/moderation";
import { usePostStore } from "src/stores/post";

const { moderatePost, fetchPostModeration, cancelModerationPostReport } =
  useBackendModerateApi();

const route = useRoute();

const { loadPostData } = usePostStore();

const DEFAULT_MODERATION_ACTION = "lock";
const moderationAction = ref<ModerationActionPosts>(DEFAULT_MODERATION_ACTION);
const actionMapping = ref(moderationActionPostsMapping);

const DEFAULT_MODERATION_REASON = "misleading";
const moderationReason = ref<ModerationReason>(DEFAULT_MODERATION_REASON);
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingReport = ref(false);

let postSlugId: string | null = null;
if (typeof route.params.postSlugId == "string") {
  postSlugId = route.params.postSlugId;
}

onMounted(async () => {
  await initializeData();
});

async function initializeData() {
  if (postSlugId != null) {
    const response = await fetchPostModeration(postSlugId);
    hasExistingReport.value = response.status == "moderated";
    if (response.status == "moderated") {
      moderationAction.value = response.action;
      moderationExplanation.value = response.explanation;
      moderationReason.value = response.reason;
    } else {
      moderationAction.value = DEFAULT_MODERATION_ACTION;
      moderationExplanation.value = "";
      moderationReason.value = DEFAULT_MODERATION_REASON;
    }
  } else {
    console.log("Missing post slug ID");
  }
}

async function clickedCancel() {
  if (postSlugId) {
    const isSuccessful = await cancelModerationPostReport(postSlugId);
    if (isSuccessful) {
      initializeData();
      loadPostData(false);
    }
  } else {
    console.log("Missing comment slug ID");
  }
}

async function clickedSubmit() {
  if (postSlugId) {
    const isSuccessful = await moderatePost(
      postSlugId,
      moderationAction.value,
      moderationReason.value,
      moderationExplanation.value
    );

    if (isSuccessful) {
      loadPostData(false);
    }
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
