<template>
  <q-infinite-scroll :offset="2000" :disable="!hasMore" @load="onLoad">
    <div>
      <div class="container">
        <AsyncStateHandler
          :query="activeQuery"
          :is-empty="customIsEmpty"
          :config="asyncStateConfig"
        >
          <CommentGroup
            :comment-item-list="visibleOpinions"
            :post-slug-id="postSlugId"
            :conversation-author-username="conversationAuthorUsername"
            :conversation-organization-name="conversationOrganizationName"
            :highlighted-opinion="targetOpinion"
            :voting-utilities="{
              userVotes,
              castVote,
            }"
            :participation-mode="props.participationMode"
            :requires-event-ticket="props.requiresEventTicket"
            :on-view-analysis="props.onViewAnalysis"
            :is-voting-disabled="props.isVotingDisabled"
            @deleted="(opinionSlugId) => handleOpinionDeleted(opinionSlugId)"
            @muted-comment="handleOpinionMuted()"
            @ticket-verified="(payload) => emit('ticketVerified', payload)"
          />
        </AsyncStateHandler>
      </div>
    </div>
  </q-infinite-scroll>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useOpinionFiltering } from "src/composables/opinion/useOpinionFiltering";
import { useOpinionPagination } from "src/composables/opinion/useOpinionPagination";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useTargetOpinion } from "src/composables/opinion/useTargetOpinion";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionItem } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, ref, watch } from "vue";

import {
  type CommentSectionTranslations,
  commentSectionTranslations,
} from "./CommentSection.i18n";
import CommentGroup from "./group/CommentGroup.vue";

const props = defineProps<{
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  preloadedQueries: {
    commentsDiscoverQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsNewQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsModeratedQuery: UseQueryReturnType<OpinionItem[], Error>;
    hiddenCommentsQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsMyVotesQuery: UseQueryReturnType<OpinionItem[], Error>;
  };
}>();

const emit = defineEmits<{
  deleted: [];
  participantCountDelta: [delta: number];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean }
  ];
}>();

import type { EventSlug, ParticipationMode } from "src/shared/types/zod";

const isComponentMounted = ref(false);

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

const { profileData } = storeToRefs(useUserStore());
const { showNotifyMessage } = useNotify();

// Get invalidation utilities
const { invalidateAll } = useInvalidateCommentQueries();

// Initialize composables
const {
  currentFilter,
  activeQuery,
  currentOpinionData,
  customIsEmpty,
  handleUserFilterChange,
  handleRetryLoadComments,
} = useOpinionFiltering({
  preloadedQueries: props.preloadedQueries,
});

const refreshData = async (): Promise<void> => {
  void invalidateAll(props.postSlugId);
  // Refetch active query — needed for lazy queries where invalidation alone won't trigger refetch
  void activeQuery.value.refetch();
  await fetchUserVotingData();
};

const {
  targetOpinion,
  setupHighlightFromRoute,
  clearRouteQueryParameters,
  refreshAndHighlightOpinion,
} = useTargetOpinion({
  refreshDataCallback: refreshData,
  onModeratedOpinionDetected: (opinion) => {
    if (opinion.moderation.status !== "moderated") {
      return;
    }
    if (opinion.moderation.action === "move") {
      currentFilter.value = "moderated";
    } else if (opinion.moderation.action === "hide") {
      if (profileData.value.isSiteModerator) {
        currentFilter.value = "hidden";
      } else {
        showNotifyMessage(t("statementRemovedByModerator"));
        targetOpinion.value = null;
      }
    }
  },
});

const { visibleOpinions, hasMore, onLoad, triggerLoadMore } =
  useOpinionPagination({
    currentOpinionData,
    currentFilter,
    isComponentMounted,
    targetOpinion,
  });

const { userVotes, castVote, fetchUserVotingData } = useOpinionVoting({
  postSlugId: props.postSlugId,
  visibleOpinions,
});

const emptyTextByFilter: Record<CommentFilterOptions, keyof CommentSectionTranslations> = {
  discover: "emptyDiscover",
  new: "emptyNew",
  moderated: "emptyModerated",
  my_votes: "emptyMyVotes",
  hidden: "emptyHidden",
};

// AsyncStateHandler configuration
const asyncStateConfig = computed(() => ({
  loading: {
    text: t("loadingOpinions"),
  },
  retrying: {
    text: t("retrying"),
  },
  error: {
    title: t("failedToLoadOpinions"),
    retryButtonText: t("retryLoadingOpinions"),
    showRetryButton: true,
  },
  empty: {
    text: t(emptyTextByFilter[currentFilter.value]),
    icon: "forum",
    iconColor: "grey-5",
  },
}));

onMounted(async (): Promise<void> => {
  await setupHighlightFromRoute();
  await clearRouteQueryParameters();
  isComponentMounted.value = true;
});

// Watch for postSlugId changes to refetch user votes when navigating between conversations
watch(
  () => props.postSlugId,
  async (newSlugId, oldSlugId) => {
    if (newSlugId && newSlugId !== oldSlugId) {
      // Reset component state for new conversation
      isComponentMounted.value = false;
      await fetchUserVotingData();
      await setupHighlightFromRoute();
      await clearRouteQueryParameters();
      isComponentMounted.value = true;
    }
  }
);

function openModerationHistory(): void {
  currentFilter.value = "moderated";
}

async function handleOpinionMuted(): Promise<void> {
  await refreshData();
}

function handleOpinionDeleted(opinionSlugId: string): void {
  // If the deleted opinion is the currently highlighted one, clear it
  if (targetOpinion.value?.opinionSlugId === opinionSlugId) {
    targetOpinion.value = null;
  }
  emit("deleted");
}

defineExpose({
  openModerationHistory,
  refreshAndHighlightOpinion,
  triggerLoadMore,
  handleRetryLoadComments,
  refreshData,
  refetchActiveQuery: () => activeQuery.value.refetch(),
  targetOpinion,
  currentFilter,
  handleUserFilterChange,
  isLoading: computed(
    () =>
      activeQuery.value.isPending.value || activeQuery.value.isRefetching.value
  ),
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 10rem;
}
</style>
