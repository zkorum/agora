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
        Moderate the conversation "{add conversation title excerpt}"
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
  ModerationActionPosts,
  ModerationReason,
} from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  moderationActionPostsMapping,
  moderationReasonMapping,
} from "src/utils/component/moderations";
import { usePostStore } from "src/stores/post";
import MainLayout from "src/layouts/MainLayout.vue";

const { moderatePost, fetchPostModeration, cancelModerationPostReport } =
  useBackendModerateApi();

const route = useRoute();
const router = useRouter();

const { loadPostData } = usePostStore();

const DEFAULT_MODERATION_ACTION = "lock";
const moderationAction = ref<ModerationActionPosts>(DEFAULT_MODERATION_ACTION);
const actionMapping = ref(moderationActionPostsMapping);

const DEFAULT_MODERATION_REASON = "misleading";
const moderationReason = ref<ModerationReason>(DEFAULT_MODERATION_REASON);
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingDecision = ref(false);

let postSlugId: string | null = null;
if (
  route.name == "/moderate/post/[postSlugId]/" &&
  typeof route.params.postSlugId == "string"
) {
  postSlugId = route.params.postSlugId;
}

onMounted(async () => {
  await initializeData();
});

async function initializeData() {
  if (postSlugId != null) {
    const response = await fetchPostModeration(postSlugId);
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
    console.log("Missing post slug ID");
  }
}

async function clickedWithdraw() {
  if (postSlugId) {
    const isSuccessful = await cancelModerationPostReport(postSlugId);
    if (isSuccessful) {
      initializeData();
      loadPostData(false);
      await router.push({
        name: "/post/[postSlugId]",
        params: { postSlugId: postSlugId },
      });
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
      await router.push({
        name: "/post/[postSlugId]",
        params: { postSlugId: postSlugId },
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
