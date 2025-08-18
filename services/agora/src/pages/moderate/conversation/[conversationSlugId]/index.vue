<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="title">
        <div>Moderate the conversation</div>
      </div>

      <div class="postPreview">
        <b>
          {{ conversationItem.payload.title }}
        </b>

        <ZKHtmlContent
          v-if="conversationItem.payload.body"
          :html-body="conversationItem.payload.body"
          :compact-mode="false"
          :enable-links="false"
        />
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

      <ZKGradientButton
        :label="hasExistingDecision ? 'Modify' : 'Moderate'"
        @click="clickedSubmit()"
      />

      <ZKGradientButton
        v-if="hasExistingDecision"
        label="Withdraw"
        gradient-background="#E7E7FF"
        label-color="#6b4eff"
        @click="clickedWithdraw()"
      />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useBackendModerateApi } from "src/utils/api/moderation";
import { useRoute, useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type {
  ConversationModerationAction,
  ExtendedConversation,
  ModerationReason,
} from "src/shared/types/zod";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import {
  moderationActionPostsMapping,
  moderationReasonMapping,
} from "src/utils/component/moderations";
import { useHomeFeedStore } from "src/stores/homeFeed";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useBackendPostApi } from "src/utils/api/post";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";

const {
  moderatePost,
  getConversationModerationStatus,
  cancelModerationPostReport,
} = useBackendModerateApi();

const route = useRoute();
const router = useRouter();

const { loadPostData, emptyPost } = useHomeFeedStore();
const { fetchPostBySlugId } = useBackendPostApi();

const DEFAULT_MODERATION_ACTION = "lock";
const moderationAction = ref<ConversationModerationAction>(
  DEFAULT_MODERATION_ACTION
);
const actionMapping = ref(moderationActionPostsMapping);

const DEFAULT_MODERATION_REASON = "misleading";
const moderationReason = ref<ModerationReason>(DEFAULT_MODERATION_REASON);
const reasonMapping = ref(moderationReasonMapping);

const moderationExplanation = ref("");

const hasExistingDecision = ref(false);

let postSlugId: string | null = null;
loadRouteParams();

const conversationItem = ref<ExtendedConversation>(emptyPost);

onMounted(async () => {
  await initializeData();
});

function loadRouteParams() {
  if (route.name == "/moderate/conversation/[conversationSlugId]/") {
    postSlugId = Array.isArray(route.params.conversationSlugId)
      ? route.params.conversationSlugId[0]
      : route.params.conversationSlugId;
  }
}

async function loadRemoteModerationData() {
  if (postSlugId) {
    const response = await getConversationModerationStatus(postSlugId);
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

async function loadRemoteConversationData() {
  if (postSlugId) {
    const response = await fetchPostBySlugId(postSlugId, false);
    if (response) {
      conversationItem.value = response;
    }
  }
}

async function initializeData() {
  await loadRemoteModerationData();
  await loadRemoteConversationData();
}

async function clickedWithdraw() {
  if (postSlugId) {
    const isSuccessful = await cancelModerationPostReport(postSlugId);
    if (isSuccessful) {
      await initializeData();
      await loadPostData();
      await redirectToPost();
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
      await loadPostData();
      await redirectToPost();
    }
  }
}

async function redirectToPost() {
  if (postSlugId) {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: postSlugId },
    });
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

.postPreview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: $button-background-color;
  padding: 1rem;
  border-radius: 15px;
}
</style>
