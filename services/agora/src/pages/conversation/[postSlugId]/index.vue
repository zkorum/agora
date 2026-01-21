<template>
  <div>
    <CommentSection
      ref="opinionSectionRef"
      :post-slug-id="conversationData.metadata.conversationSlugId"
      :login-required-to-participate="
        conversationData.metadata.isLoginRequired
      "
      :requires-event-ticket="conversationData.metadata.requiresEventTicket"
      :preloaded-queries="{
        commentsDiscoverQuery,
        commentsNewQuery,
        commentsModeratedQuery,
        hiddenCommentsQuery,
        commentsMyVotesQuery,
      }"
      @deleted="decrementOpinionCount()"
      @participant-count-delta="handleParticipantCountDelta"
      @ticket-verified="(payload) => handleTicketVerified(payload)"
    />

    <FloatingBottomContainer>
      <CommentComposer
        :post-slug-id="conversationData.metadata.conversationSlugId"
        :login-required-to-participate="
          conversationData.metadata.isLoginRequired
        "
        :requires-event-ticket="conversationData.metadata.requiresEventTicket"
        @submitted-comment="submittedComment"
        @ticket-verified="(payload) => handleTicketVerified(payload)"
      />
    </FloatingBottomContainer>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import FloatingBottomContainer from "src/components/navigation/FloatingBottomContainer.vue";
import CommentComposer from "src/components/post/comments/CommentComposer.vue";
import CommentSection from "src/components/post/comments/CommentSection.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import { computed, inject, onMounted, provide, type Ref, ref, watch } from "vue";

// Props from parent
const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
}>();

// Provide conversation data to all descendants (reactive)
provide("conversationData", computed(() => props.conversationData));

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

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();

const { forceRefreshAnalysis } = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();
const authStore = useAuthenticationStore();

const { profileData } = storeToRefs(userStore);
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

// Create computed properties to ensure reactivity
const isModerator = computed(() => profileData.value.isModerator);
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);

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
  enabled: () => props.hasConversationData,
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId,
  filter: "moderated",
  voteCount,
  enabled: () => props.hasConversationData,
});

const commentsMyVotesQuery = useCommentsQuery({
  conversationSlugId,
  filter: "my_votes",
  voteCount,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value && props.hasConversationData),
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId,
  voteCount,
  enabled: computed(() => isModerator.value && props.hasConversationData),
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

async function submittedComment(data: {
  opinionSlugId: string;
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
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
      "[ConversationCommentPage] New guest user detected - performing deferred cache refresh"
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

async function handleTicketVerified(payload: {
  userIdChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
  console.log(
    "[ConversationCommentPage] Ticket verified event received",
    payload
  );

  if (payload.needsCacheRefresh) {
    console.log(
      "[ConversationCommentPage] New guest via Zupass - performing deferred cache refresh"
    );
    await loadAuthenticatedModules();
  }
}

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(opinionSectionRef.value?.isLoading ?? false);
});
</script>

<style scoped lang="scss"></style>
