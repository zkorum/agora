<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar title="" :center-content="false" />
  </Teleport>

  <div class="container">
    <div class="title">
      <div>{{ t("moderateConversation") }}</div>
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
      :label="t('action')"
      emit-value
      map-options
    />

    <q-select
      v-model="moderationReason"
      :options="reasonMapping"
      :label="t('reason')"
      emit-value
      map-options
    />

    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input
      v-model="moderationExplanation"
      :label="t('explanationOptional')"
    />

    <ZKGradientButton
      :label="hasExistingDecision ? t('modify') : t('moderate')"
      @click="clickedSubmit()"
    />

    <ZKGradientButton
      v-if="hasExistingDecision"
      :label="t('withdraw')"
      gradient-background="#E7E7FF"
      label-color="#6b4eff"
      @click="clickedWithdraw()"
    />
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationModerationAction,
  ConversationModerationProperties,
  ExtendedConversation,
  ModerationReason,
} from "src/shared/types/zod";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useBackendModerateApi } from "src/utils/api/moderation";
import { useBackendPostApi } from "src/utils/api/post/post";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";
import {
  moderationActionPostsMapping,
  moderationReasonMapping,
} from "src/utils/component/moderations";
import { getSingleRouteParam } from "src/utils/router/params";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationModerationTranslations,
  conversationModerationTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });

const {
  moderatePost,
  getConversationModerationStatus,
  cancelModerationPostReport,
} = useBackendModerateApi();

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const { emptyPost } = useHomeFeedStore();
const { invalidateFeed } = useInvalidateFeedQuery();
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

const { t } = useComponentI18n<ConversationModerationTranslations>(
  conversationModerationTranslations
);

onMounted(async () => {
  await initializeData();
});

function loadRouteParams() {
  if (route.name == "/moderate/conversation/[conversationSlugId]/") {
    postSlugId = getSingleRouteParam(route.params.conversationSlugId) || null;
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

function updateConversationModerationCache({
  moderation,
}: {
  moderation: ConversationModerationProperties;
}): void {
  if (!postSlugId) {
    return;
  }

  const fallbackConversation =
    conversationItem.value.metadata.conversationSlugId === postSlugId
      ? conversationItem.value
      : undefined;

  updateConversationQueryCache({
    queryClient,
    conversationSlugId: postSlugId,
    updateConversation: (conversation) => ({
      ...conversation,
      metadata: {
        ...conversation.metadata,
        moderation,
      },
    }),
    fallbackConversation,
  });

  if (fallbackConversation) {
    conversationItem.value = {
      ...fallbackConversation,
      metadata: {
        ...fallbackConversation.metadata,
        moderation,
      },
    };
  }
}

function getModeratedConversationState(): ConversationModerationProperties {
  const now = new Date();
  const existingModeration = conversationItem.value.metadata.moderation;

  return {
    status: "moderated",
    action: moderationAction.value,
    reason: moderationReason.value,
    explanation: moderationExplanation.value,
    createdAt:
      existingModeration.status === "moderated"
        ? existingModeration.createdAt
        : now,
    updatedAt: now,
  };
}

async function clickedWithdraw() {
  if (postSlugId) {
    const isSuccessful = await cancelModerationPostReport(postSlugId);
    if (isSuccessful) {
      hasExistingDecision.value = false;
      moderationAction.value = DEFAULT_MODERATION_ACTION;
      moderationExplanation.value = "";
      moderationReason.value = DEFAULT_MODERATION_REASON;
      updateConversationModerationCache({
        moderation: { status: "unmoderated" },
      });
      invalidateFeed();
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
      hasExistingDecision.value = true;
      updateConversationModerationCache({
        moderation: getModeratedConversationState(),
      });
      invalidateFeed();
      await redirectToPost();
    }
  }
}

async function redirectToPost() {
  if (postSlugId) {
    await router.push({
      name: "/conversation/[postSlugId]/",
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
