<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasSettingsButton: false,
      hasCloseButton: true,
      hasLoginButton: true,
    }"
  >
    <div class="container">
      <div class="title">
        Moderate the opinion "{add opinion title excerpt}"
      </div>

      <q-select
        v-model="moderationAction"
        :options="actionMapping"
        label="Action"
        emit-value
        map-options
      />

      <q-select
        v-model="moderationReason"
        :options="reasonMapping"
        label="Reason"
        emit-value
        map-options
      />

      <q-input v-model="moderationExplanation" label="Explanation (optional)" />

      <ZKButton
        v-if="!hasExistingDecision"
        label="Modify"
        color="primary"
        @click="clickedSubmit()"
      />
      <ZKButton
        v-if="hasExistingDecision"
        label="Moderate"
        color="primary"
        @click="clickedSubmit()"
      />

      <ZKButton
        v-if="hasExistingDecision"
        label="Withdraw"
        color="secondary"
        text-color="primary"
        @click="clickedWithdraw()"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { useBackendModerateApi } from "src/utils/api/moderation";
import { useRoute, useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import type {
  OpinionModerationAction,
  ModerationReason,
} from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  opinionModerationActionMapping,
  moderationReasonMapping,
} from "src/utils/component/moderations";
import MainLayout from "src/layouts/MainLayout.vue";

const {
  moderateComment,
  getOpinionModerationStatus: fetchCommentModeration,
  cancelModerationCommentReport,
} = useBackendModerateApi();

const route = useRoute();
const router = useRouter();

const DEFAULT_MODERATION_ACTION = "move";
const moderationAction = ref<OpinionModerationAction>(
  DEFAULT_MODERATION_ACTION
);
const actionMapping = ref(opinionModerationActionMapping);

const DEFAULT_MODERATION_REASON = "misleading";
const moderationReason = ref<ModerationReason>(DEFAULT_MODERATION_REASON);
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingDecision = ref(false);

let postSlugId: string | null = null;
let commentSlugId: string | null = null;
loadRouteParams();

onMounted(async () => {
  await initializeData();
});

function loadRouteParams() {
  if (route.name == "/moderate/opinion/[postSlugId]/[commentSlugId]/") {
    postSlugId = route.params.postSlugId;
    commentSlugId = route.params.commentSlugId;
  }
}

async function initializeData() {
  if (commentSlugId != null) {
    const response = await fetchCommentModeration(commentSlugId);
    hasExistingDecision.value = response.status == "moderated";
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
    console.log("Missing comment slug ID");
  }
}

async function clickedWithdraw() {
  if (commentSlugId) {
    await cancelModerationCommentReport(commentSlugId);
    await initializeData();
    // TODO: redirect to comment
    // await router.push({
    //   name: "single-post",
    //   params: { postSlugId: postSlugId },
    // });
  } else {
    console.log("Missing comment slug ID");
  }
}

async function clickedSubmit() {
  if (postSlugId && commentSlugId) {
    const isSuccessful = await moderateComment(
      commentSlugId,
      moderationAction.value,
      moderationReason.value,
      moderationExplanation.value
    );
    if (isSuccessful) {
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: postSlugId },
        query: { opinionSlugId: commentSlugId },
      });
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.title {
  font-size: 1.2rem;
}
</style>
