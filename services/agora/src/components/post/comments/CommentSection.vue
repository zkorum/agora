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
          :custom-is-empty="customIsEmpty"
          :loading-text="t('loadingOpinions')"
          :retrying-text="t('retrying')"
          :error-title="t('failedToLoadOpinions')"
          :empty-text="t('noOpinionsAvailable')"
          :retry-label="t('retryLoadingOpinions')"
          empty-icon="forum"
          empty-icon-color="grey-5"
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
            @deleted="handleOpinionDeleted()"
            @muted-comment="handleOpinionMuted()"
          />
        </AsyncStateHandler>
      </div>
    </div>
  </q-infinite-scroll>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import CommentGroup from "./group/CommentGroup.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import OpinionNotFoundBanner from "./OpinionNotFoundBanner.vue";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import {
  commentSectionTranslations,
  type CommentSectionTranslations,
} from "./CommentSection.i18n";
import { useOpinionFiltering } from "src/composables/opinion/useOpinionFiltering";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { useTargetOpinion } from "src/composables/opinion/useTargetOpinion";
import { useOpinionPagination } from "src/composables/opinion/useOpinionPagination";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { OpinionItem } from "src/shared/types/zod";

const emit = defineEmits(["deleted", "participantCountDelta", "voteCast"]);

const props = defineProps<{
  postSlugId: string;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
  preloadedQueries: {
    commentsDiscoverQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsNewQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsModeratedQuery: UseQueryReturnType<OpinionItem[], Error>;
    hiddenCommentsQuery: UseQueryReturnType<OpinionItem[], Error>;
  };
}>();

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
