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
      <div class="title">Moderate the opinion</div>

      <div class="userOpinion">
        <ZKHtmlContent
          :html-body="opinionItem.opinion"
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

      <ZKButton
        button-type="largeButton"
        :label="hasExistingDecision ? 'Modify' : 'Moderate'"
        color="primary"
        @click="clickedSubmit()"
      />

      <ZKButton
        v-if="hasExistingDecision"
        button-type="largeButton"
        label="Withdraw"
        color="secondary"
        text-color="primary"
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
  OpinionModerationAction,
  ModerationReason,
  OpinionItem,
} from "src/shared/types/zod";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  opinionModerationActionMapping,
  moderationReasonMapping,
} from "src/utils/component/moderations";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useBackendCommentApi } from "src/utils/api/comment";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";

const {
  moderateComment,
  getOpinionModerationStatus: fetchCommentModeration,
  cancelModerationCommentReport,
} = useBackendModerateApi();

const { fetchOpinionsBySlugIdList } = useBackendCommentApi();

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

const opinionItem = ref<OpinionItem>({
  opinion: "",
  opinionSlugId: "",
  createdAt: new Date(),
  numParticipants: 0,
  numDisagrees: 0,
  numAgrees: 0,
  numPasses: 0,
  updatedAt: new Date(),
  username: "",
  isSeed: false,
  moderation: {
    status: "unmoderated",
  },
  clustersStats: [],
});

onMounted(async () => {
  await initializeData();
});

function loadRouteParams() {
  if (
    route.name ==
    "/moderate/conversation/[conversationSlugId]/opinion/[opinionSlugId]/"
  ) {
    postSlugId = Array.isArray(route.params.conversationSlugId)
      ? route.params.conversationSlugId[0]
      : route.params.conversationSlugId;
    commentSlugId = Array.isArray(route.params.opinionSlugId)
      ? route.params.opinionSlugId[0]
      : route.params.opinionSlugId;
  }
}

async function initializeData() {
  if (commentSlugId) {
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

  if (commentSlugId) {
    const response = await fetchOpinionsBySlugIdList([commentSlugId]);
    opinionItem.value = response[0];
  }
}

async function clickedWithdraw() {
  if (commentSlugId) {
    await cancelModerationCommentReport(commentSlugId);
    await initializeData();
    await redirectToComment();
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
      await redirectToComment();
    }
  }
}

async function redirectToComment() {
  if (postSlugId && commentSlugId) {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: postSlugId },
      query: { opinion: commentSlugId },
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

.userOpinion {
  background-color: $button-background-color;
  padding: 1rem;
  border-radius: 15px;
}
</style>
