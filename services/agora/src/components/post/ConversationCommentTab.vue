<template>
  <div>
    <CommentSection
      ref="opinionSectionRef"
      :post-slug-id="conversationData.metadata.conversationSlugId"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="conversationData.metadata.organization?.name ?? ''"
      :participation-mode="
        conversationData.metadata.participationMode
      "
      :requires-event-ticket="conversationData.metadata.requiresEventTicket"
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="isVotingDisabled"
      :preloaded-queries="{
        commentsDiscoverQuery,
        commentsNewQuery,
        commentsModeratedQuery,
        hiddenCommentsQuery,
        commentsMyVotesQuery,
      }"
      @deleted="decrementOpinionCount()"
      @participant-count-delta="handleParticipantCountDelta"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { SubmittedCommentData } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, inject, onActivated, onMounted, type Ref, ref, watch } from "vue";

import CommentSection from "./comments/CommentSection.vue";

// Props from parent
const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  moderationHistoryTrigger: number;
  commentFilter: CommentFilterOptions;
  onViewAnalysis: () => void;
}>();

const emit = defineEmits<{
  "update:commentFilter": [filter: CommentFilterOptions];
}>();

// Inject shared state from parent
const opinionCountOffset = inject<Ref<number>>("opinionCountOffset", ref(0));
const participantCountOffset = inject<Ref<number>>("participantCountOffset", ref(0));
const setCurrentTabLoading = inject<(loading: boolean) => void>(
  "setCurrentTabLoading",
  () => {
    /* noop */
  }
);
const decrementOpinionCount = inject<() => void>("decrementOpinionCount", () => {
  /* noop */
});
const registerChildRefreshHandler = inject<(handler: () => Promise<void>) => void>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
  }
);
const registerSubmittedCommentHandler = inject<
  (handler: (data: SubmittedCommentData) => Promise<void>) => void
>("registerSubmittedCommentHandler", () => {
  /* noop */
});

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();

const { forceRefreshAnalysis, markCommentsAsStale } = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();

const { profileData } = storeToRefs(userStore);

const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);

// Compute voting disabled state for drilling to CommentActionBar
const isVotingDisabled = computed(() => {
  const data = props.conversationData;
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
  enabled: () => props.hasConversationData,
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

function handleParticipantCountDelta(delta: number): void {
  participantCountOffset.value += delta;
}

// Report loading state to parent (for spinner in PostActionBar)
watch(
  () => opinionSectionRef.value?.isLoading ?? false,
  (isLoading) => {
    setCurrentTabLoading(isLoading);
  }
);

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
  opinionCountOffset.value += 1;

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(
      data.opinionSlugId
    );
  }

  // Force refresh analysis data since new opinion affects analysis results
  forceRefreshAnalysis(props.conversationData.metadata.conversationSlugId);

  // Handle deferred cache refresh if auth state changed (new guest user)
  if (data.needsCacheRefresh) {
    console.log(
      "[ConversationCommentTab] New guest user detected - performing deferred cache refresh"
    );

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

registerChildRefreshHandler(handleChildRefresh);

onActivated(() => {
  registerChildRefreshHandler(handleChildRefresh);
  registerSubmittedCommentHandler(submittedComment);
});

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(opinionSectionRef.value?.isLoading ?? false);
  registerSubmittedCommentHandler(submittedComment);
});
</script>

<style scoped lang="scss"></style>
