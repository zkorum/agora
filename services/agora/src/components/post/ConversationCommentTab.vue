<template>
  <div v-if="conversationData !== undefined">
    <CommentSection
      ref="opinionSectionRef"
      :post-slug-id="conversationData.metadata.conversationSlugId"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="conversationData.metadata.organization?.name ?? ''"
      :participation-mode="
        conversationData.metadata.participationMode
      "
      :requires-event-ticket="conversationData.metadata.requiresEventTicket"
      :survey-gate="conversationData.interaction.surveyGate"
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="isVotingDisabled"
      :conversation-route-context="props.conversationRouteContext"
      :preloaded-queries="{
        commentsDiscoverQuery,
        commentsNewQuery,
        commentsModeratedQuery,
        hiddenCommentsQuery,
        commentsMyVotesQuery,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import type {
  RegisterChildRefreshHandler,
  SubmittedCommentData,
} from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";

import CommentSection from "./comments/CommentSection.vue";

// Props from parent
const props = defineProps<{
  conversationData: ExtendedConversationDisplayData | undefined;
  moderationHistoryTrigger: number;
  commentFilter: CommentFilterOptions;
  onViewAnalysis: () => void;
  conversationRouteContext: ConversationRouteContext;
}>();

const emit = defineEmits<{
  "update:commentFilter": [filter: CommentFilterOptions];
}>();

const setCurrentTabLoading = inject<(loading: boolean) => void>(
  "setCurrentTabLoading",
  () => {
    /* noop */
  }
);
const registerChildRefreshHandler = inject<RegisterChildRefreshHandler>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
    return () => {
      /* noop */
    };
  }
);
const registerSubmittedCommentHandler = inject<
  (handler: (data: SubmittedCommentData) => Promise<void>) => void
>("registerSubmittedCommentHandler", () => {
  /* noop */
});

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();
const isTabActive = ref(true);
let unregisterChildRefreshHandler: (() => void) | undefined;

const { markAnalysisAsStale, markCommentsAsStale } = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();

const { profileData } = storeToRefs(userStore);

// Route transitions can temporarily omit data; inert inputs keep queries disabled.
const conversationSlugId = computed(
  () => props.conversationData?.metadata.conversationSlugId ?? ""
);
const voteCount = computed(() => props.conversationData?.metadata.voteCount);

// Compute voting disabled state for drilling to CommentActionBar
const isVotingDisabled = computed(() => {
  const data = props.conversationData;
  if (data === undefined) {
    return true;
  }

  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";
  return isModeratedAndLocked || data.metadata.isClosed;
});

// Preload comment queries for all filter types
const commentsDiscoverQuery = useCommentsQuery({
  conversationSlugId,
  filter: "discover",
  voteCount,
  enabled: () => props.conversationData !== undefined,
});

const commentsNewQuery = useCommentsQuery({
  conversationSlugId,
  filter: "new",
  voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId,
  filter: "moderated",
  voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const commentsMyVotesQuery = useCommentsQuery({
  conversationSlugId,
  filter: "my_votes",
  voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId,
  voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const isLoading = computed(
  () => isTabActive.value && (opinionSectionRef.value?.isLoading ?? false)
);

// Report loading state to parent (for spinner in PostActionBar)
watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

// Sync filter: when parent changes filter (user clicked sorting selector), tell CommentSection
watch(
  () => props.commentFilter,
  (newFilter) => {
    if (opinionSectionRef.value && opinionSectionRef.value.currentFilter !== newFilter) {
      opinionSectionRef.value.handleUserFilterChange(newFilter);
    }
  }
);

// Sync filter: when CommentSection changes filter internally (e.g. openModerationHistory), tell parent
watch(
  () => opinionSectionRef.value?.currentFilter,
  (newFilter) => {
    if (newFilter !== undefined && newFilter !== props.commentFilter) {
      emit("update:commentFilter", newFilter);
    }
  }
);

async function submittedComment(data: SubmittedCommentData): Promise<void> {
  const currentConversation = props.conversationData;
  if (currentConversation === undefined) {
    return;
  }

  await markCommentsAsStale(currentConversation.metadata.conversationSlugId);
  markAnalysisAsStale(currentConversation.metadata.conversationSlugId);

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(data.opinionSlugId);
  }

  // Handle deferred cache refresh if auth state changed (new guest user)
  if (data.needsCacheRefresh) {
    await loadAuthenticatedModules();

    if (opinionSectionRef.value) {
      await opinionSectionRef.value.refreshAndHighlightOpinion(
        data.opinionSlugId
      );

      const targetOpinion = opinionSectionRef.value.targetOpinion;
      if (targetOpinion && targetOpinion.username) {
        profileData.value.userName = targetOpinion.username;
      }
    }
  }
}

watch(
  () => props.moderationHistoryTrigger,
  () => {
    if (opinionSectionRef.value) {
      opinionSectionRef.value.openModerationHistory();
    }
  }
);

async function handleChildRefresh(): Promise<void> {
  const section = opinionSectionRef.value;
  if (!section) return;
  await Promise.all([
    markCommentsAsStale(conversationSlugId.value),
    section.refetchActiveQuery(),
  ]);
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = registerChildRefreshHandler(handleChildRefresh);
}

function unregisterRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = undefined;
}

registerRefreshHandler();

onActivated(() => {
  isTabActive.value = true;
  registerRefreshHandler();
  registerSubmittedCommentHandler(submittedComment);
});

onDeactivated(() => {
  isTabActive.value = false;
  unregisterRefreshHandler();
});

onUnmounted(unregisterRefreshHandler);

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
  registerSubmittedCommentHandler(submittedComment);
});
</script>

<style scoped lang="scss"></style>
