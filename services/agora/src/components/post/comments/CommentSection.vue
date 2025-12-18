<template>
  <q-infinite-scroll :offset="2000" :disable="!hasMore" @load="onLoad">
    <div>
      <div class="container">
        <div class="commentSectionToolbar">
          <div class="commentSortingSelector">
            <CommentSortingSelector
              :filter-value="currentFilter"
              @changed-algorithm="
                (filterValue: CommentFilterOptions) =>
                  handleUserFilterChange(filterValue)
              "
            />
          </div>
        </div>

        <!-- Opinion not found banner -->
        <OpinionNotFoundBanner
          :is-visible="opinionNotFoundState.isVisible"
          :opinion-id="opinionNotFoundState.opinionId"
          @dismiss="dismissOpinionNotFoundBanner"
        />

        <AsyncStateHandler
          :query="activeQuery"
          :is-empty="customIsEmpty"
          :config="asyncStateConfig"
        >
          <CommentGroup
            :comment-item-list="visibleOpinions"
            :post-slug-id="postSlugId"
            :highlighted-opinion="targetOpinion"
            :voting-utilities="{
              userVotes,
              castVote,
            }"
            :is-post-locked="isPostLocked"
            :login-required-to-participate="props.loginRequiredToParticipate"
            :requires-event-ticket="props.requiresEventTicket"
            @deleted="handleOpinionDeleted()"
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
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useOpinionFiltering } from "src/composables/opinion/useOpinionFiltering";
import { useOpinionPagination } from "src/composables/opinion/useOpinionPagination";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useTargetOpinion } from "src/composables/opinion/useTargetOpinion";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionItem } from "src/shared/types/zod";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed,onMounted, ref } from "vue";

import {
  type CommentSectionTranslations,
  commentSectionTranslations,
} from "./CommentSection.i18n";
import CommentGroup from "./group/CommentGroup.vue";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import OpinionNotFoundBanner from "./OpinionNotFoundBanner.vue";

const props = defineProps<{
  postSlugId: string;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
  preloadedQueries: {
    commentsDiscoverQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsNewQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsModeratedQuery: UseQueryReturnType<OpinionItem[], Error>;
    hiddenCommentsQuery: UseQueryReturnType<OpinionItem[], Error>;
  };
}>();

const emit = defineEmits<{
  deleted: [];
  participantCountDelta: [delta: number];
  voteCast: [];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean }
  ];
}>();

import type { EventSlug } from "src/shared/types/zod";

const isComponentMounted = ref(false);

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

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
  invalidateAll(props.postSlugId);
  await fetchUserVotingData();
};

const {
  targetOpinion,
  opinionNotFoundState,
  setupHighlightFromRoute,
  clearRouteQueryParameters,
  dismissOpinionNotFoundBanner,
  refreshAndHighlightOpinion,
} = useTargetOpinion(refreshData);

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
  onVoteCast: () => emit("voteCast"),
});

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
    text: t("noOpinionsAvailable"),
    icon: "forum",
    iconColor: "grey-5",
  },
}));

onMounted(async (): Promise<void> => {
  await fetchUserVotingData();
  await setupHighlightFromRoute();
  await clearRouteQueryParameters();
  isComponentMounted.value = true;
});

function openModerationHistory(): void {
  currentFilter.value = "moderated";
}

async function handleOpinionMuted(): Promise<void> {
  await refreshData();
}

function handleOpinionDeleted(): void {
  emit("deleted");
}

defineExpose({
  openModerationHistory,
  refreshAndHighlightOpinion,
  triggerLoadMore,
  handleRetryLoadComments,
  refreshData,
  targetOpinion,
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
  padding-top: 1rem;
  padding-bottom: 10rem;
}

.commentSectionToolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  align-items: end;
}

.commentSortingSelector {
  margin-left: auto;
}
</style>
