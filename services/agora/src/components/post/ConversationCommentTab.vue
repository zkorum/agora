<template>
  <div v-if="conversationData !== undefined">
    <OneAtATimeSection
      v-if="opinionView.kind === 'one_at_a_time'"
      :key="`${conversationData.metadata.conversationSlugId}:${opinionView.order}`"
      ref="oneAtATimeRef"
      :post-slug-id="conversationData.metadata.conversationSlugId"
      :order="opinionView.order"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="
        conversationData.metadata.organization?.name ?? ''
      "
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="isVotingDisabled"
      :conversation-route-context="props.conversationRouteContext"
      :editing-opinion="editingOpinion"
      @edit-opinion="emit('editOpinion', $event)"
    />
    <OpinionList
      v-else-if="opinionView.kind === 'list'"
      :key="conversationData.metadata.conversationSlugId"
      ref="opinionSectionRef"
      :post-slug-id="conversationData.metadata.conversationSlugId"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="
        conversationData.metadata.organization?.name ?? ''
      "
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="isVotingDisabled"
      :conversation-route-context="props.conversationRouteContext"
      :opinion-state="opinionState"
      :editing-opinion="editingOpinion"
      @edit-opinion="emit('editOpinion', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import type {
  RegisterChildRefreshHandler,
  SubmittedCommentData,
} from "src/composables/conversation/useConversationParentState";
import type { OpinionEditRequest } from "src/composables/opinion/types";
import type { OpinionListState } from "src/composables/opinion/useOpinionListState";
import type {
  DisplayedOpinionItem,
  ExtendedConversationDisplayData,
} from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
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

import OneAtATimeSection from "./comments/OneAtATimeSection.vue";
import OpinionList from "./comments/OpinionList.vue";
import {
  type OpinionView,
  resolveOpinionView,
} from "./comments/opinionPresentation";

// Props from parent
const props = defineProps<{
  conversationData: ExtendedConversationDisplayData | undefined;
  opinionState: OpinionListState;
  onViewAnalysis: () => void;
  conversationRouteContext: ConversationRouteContext;
  editingOpinion: DisplayedOpinionItem | undefined;
}>();

const emit = defineEmits<{
  editOpinion: [request: OpinionEditRequest];
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

const opinionSectionRef = ref<InstanceType<typeof OpinionList>>();
const oneAtATimeRef = ref<InstanceType<typeof OneAtATimeSection>>();
const isTabActive = ref(true);
let unregisterChildRefreshHandler: (() => void) | undefined;

const { markCommentsAsStale } = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();

const { profileData } = storeToRefs(userStore);

const opinionView = computed<OpinionView | { kind: "unavailable" }>(() => {
  const data = props.conversationData;
  if (data === undefined) return { kind: "unavailable" };
  return resolveOpinionView({
    metadata: data.metadata,
    routeContext: props.conversationRouteContext,
    filter: props.opinionState.filter.value,
  });
});

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

const isLoading = computed(
  () =>
    isTabActive.value &&
    opinionView.value.kind !== "unavailable" &&
    (opinionView.value.kind === "one_at_a_time"
      ? (oneAtATimeRef.value?.isLoading ?? false)
      : (opinionSectionRef.value?.isLoading ?? false))
);

// Report loading state to parent (for spinner in PostActionBar)
watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

async function submittedComment(data: SubmittedCommentData): Promise<void> {
  if (props.conversationData === undefined) {
    return;
  }

  if (opinionSectionRef.value) {
    opinionSectionRef.value.highlightOpinion(data.displayedOpinionItem);
  }
  if (oneAtATimeRef.value) {
    if (data.kind === "edited")
      await oneAtATimeRef.value.acknowledgeEditedOpinion(
        data.displayedOpinionItem
      );
    else
      await oneAtATimeRef.value.acknowledgeCreatedOpinion(
        data.displayedOpinionItem.opinionSlugId
      );
  }

  // Handle deferred cache refresh if auth state changed (new guest user)
  if (data.needsCacheRefresh) {
    await loadAuthenticatedModules();

    profileData.value.userName = data.displayedOpinionItem.username;
  }
}

async function handleChildRefresh(): Promise<void> {
  if (oneAtATimeRef.value) {
    await oneAtATimeRef.value.refresh();
    return;
  }
  const section = opinionSectionRef.value;
  const data = props.conversationData;
  if (!section || data === undefined) return;
  await Promise.all([
    markCommentsAsStale(data.metadata.conversationSlugId),
    section.refetchActiveQuery(),
  ]);
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler =
    registerChildRefreshHandler(handleChildRefresh);
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
