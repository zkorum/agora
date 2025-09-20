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
            :comment-slug-id-liked-map="opinionVoteMap"
            :is-post-locked="isPostLocked"
            :login-required-to-participate="props.loginRequiredToParticipate"
            @deleted="handleOpinionDeleted()"
            @muted-comment="handleOpinionMuted()"
            @change-vote="
              (vote: VotingAction, opinionSlugId: string) =>
                changeVote(vote, opinionSlugId)
            "
          />
        </AsyncStateHandler>
      </div>
    </div>
  </q-infinite-scroll>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import type { VotingAction, VotingOption } from "src/shared/types/zod";
import { type OpinionItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./group/CommentGroup.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useNotify } from "src/utils/ui/notify";
import { useRouteQuery } from "@vueuse/router";
import { useRouter, useRoute } from "vue-router";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useUserStore } from "src/stores/user";
import { useOpinionScrollable } from "src/composables/ui/useOpinionScrollable";
import { useOpinionAgreements } from "src/composables/ui/useOpinionAgreements";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import {
  commentSectionTranslations,
  type CommentSectionTranslations,
} from "./CommentSection.i18n";

const emit = defineEmits(["deleted", "participantCountDelta"]);

const props = defineProps<{
  postSlugId: string;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
}>();

const currentFilter = ref<CommentFilterOptions>("discover");
const isComponentMounted = ref(false);
const targetOpinion = ref<OpinionItem | null>(null);

const { profileData } = storeToRefs(useUserStore());
const router = useRouter();
const route = useRoute();
const opinionSlugIdQuery = useRouteQuery("opinion", "", {
  transform: String,
});
const { showNotifyMessage } = useNotify();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

// Get invalidation utilities
const { invalidateAll } = useInvalidateCommentQueries();

// TanStack Query hooks for different comment filters
const commentsNewQuery = useCommentsQuery({
  conversationSlugId: props.postSlugId,
  filter: "new",
  enabled: true,
});

const commentsDiscoverQuery = useCommentsQuery({
  conversationSlugId: props.postSlugId,
  filter: "discover",
  enabled: true,
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId: props.postSlugId,
  filter: "moderated",
  enabled: true,
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId: props.postSlugId,
  enabled: profileData.value.isModerator,
});

// Opinion scrolling functionality
const { loadMore, hasMore, visibleOpinions, initializeOpinionList } =
  useOpinionScrollable();

// Opinion agreements functionality
const { addOpinionAgreement, removeOpinionAgreement } =
  useOpinionAgreements(visibleOpinions);

// Simple target opinion fetching using the API
const { fetchOpinionsBySlugIdList } = useBackendCommentApi();

// Internal vote map management
const opinionVoteMap = ref<Map<string, VotingOption>>(new Map());

// Active query based on current filter
const activeQuery = computed(() => {
  switch (currentFilter.value) {
    case "discover":
      return commentsDiscoverQuery;
    case "new":
      return commentsNewQuery;
    case "moderated":
      return commentsModeratedQuery;
    case "hidden":
      return hiddenCommentsQuery;
    default:
      return commentsDiscoverQuery;
  }
});

// Computed data from TanStack Query
const opinionsNew = computed(() => commentsNewQuery.data.value || []);
const opinionsDiscover = computed(() => commentsDiscoverQuery.data.value || []);
const opinionsModerated = computed(
  () => commentsModeratedQuery.data.value || []
);
const opinionsHidden = computed(() => hiddenCommentsQuery.data.value || []);

// Improved empty state logic that properly handles cached data
const customIsEmpty = computed(() => {
  const query = activeQuery.value;

  // Only show empty state if query succeeded but returned no data
  if (
    query.isSuccess.value &&
    (!query.data.value || query.data.value.length === 0)
  ) {
    return true;
  }

  // If we have cached data but visibleOpinions isn't populated yet, don't show empty
  if (query.data.value && query.data.value.length > 0) {
    return false;
  }

  // Default: check visibleOpinions for edge cases
  return visibleOpinions.value.length === 0;
});

// Watch for when query data becomes available - populate immediately for cached data
watch(opinionsDiscover, (newData, oldData) => {
  if (!newData) {
    return;
  }
  // Trigger update for current filter or if component not mounted yet (cached data)
  if (
    currentFilter.value === "discover" &&
    (newData !== oldData || !isComponentMounted.value)
  ) {
    updateOpinionList("discover");
  }
});

watch(opinionsNew, (newData, oldData) => {
  if (!newData) {
    return;
  }
  if (
    currentFilter.value === "new" &&
    (newData !== oldData || !isComponentMounted.value)
  ) {
    updateOpinionList("new");
  }
});

watch(opinionsModerated, (newData, oldData) => {
  if (!newData) {
    return;
  }
  if (
    currentFilter.value === "moderated" &&
    (newData !== oldData || !isComponentMounted.value)
  ) {
    updateOpinionList("moderated");
  }
});

watch(opinionsHidden, (newData, oldData) => {
  if (!newData) {
    return;
  }
  if (
    currentFilter.value === "hidden" &&
    (newData !== oldData || !isComponentMounted.value)
  ) {
    updateOpinionList("hidden");
  }
});

watch(currentFilter, (newFilter) => {
  if (!isComponentMounted.value) {
    return;
  }

  updateOpinionList(newFilter);
});

function updateOpinionList(filter: CommentFilterOptions) {
  const opinionData = getOpinionDataForFilter(filter);
  initializeOpinionList(opinionData);
}

function getOpinionDataForFilter(filter: CommentFilterOptions): OpinionItem[] {
  switch (filter) {
    case "new":
      return opinionsNew.value;
    case "discover":
      return opinionsDiscover.value;
    case "hidden":
      return opinionsHidden.value;
    case "moderated":
      return opinionsModerated.value;
    default:
      return opinionsDiscover.value;
  }
}

onMounted(async () => {
  await fetchUserVotingData();
  await setupHighlightFromRoute();
  await clearRouteQueryParameters();
  isComponentMounted.value = true;

  // Explicitly initialize the opinion list
  updateOpinionList(currentFilter.value);
});

async function clearRouteQueryParameters() {
  if (Object.keys(route.query).length > 0) {
    await router.replace({
      path: route.path,
      query: {},
    });
  }
}

async function fetchUserVotingData() {
  if (isGuestOrLoggedIn.value) {
    const response = await fetchUserVotesForPostSlugIds([props.postSlugId]);
    if (response) {
      const newMap = new Map();
      response.forEach((userVote) => {
        newMap.set(userVote.opinionSlugId, userVote.votingAction);
      });
      opinionVoteMap.value = newMap;
    } else {
      opinionVoteMap.value = new Map();
    }
  }
}

async function setupHighlightFromRoute() {
  const opinionSlugId = opinionSlugIdQuery.value;
  if (opinionSlugId && opinionSlugId.trim() !== "") {
    await fetchTargetOpinion(opinionSlugId);
  }
}

async function fetchTargetOpinion(opinionSlugId: string) {
  console.log("Fetching target opinion:", opinionSlugId);

  if (opinionSlugId === "") {
    return;
  }

  try {
    const opinions = await fetchOpinionsBySlugIdList([opinionSlugId]);
    if (opinions.length > 0) {
      targetOpinion.value = opinions[0];
    } else {
      showNotifyMessage(t("opinionNotFound") + " " + opinionSlugId);
    }
  } catch (error) {
    console.error("Error fetching target opinion:", error);
    showNotifyMessage(t("opinionNotFound") + " " + opinionSlugId);
  }
}

async function refreshAndHighlightOpinion(opinionSlugId: string) {
  // Use centralized refresh method
  await refreshData();

  // Fetch the target opinion again
  await fetchTargetOpinion(opinionSlugId);
}

function openModerationHistory() {
  currentFilter.value = "moderated";
}

function handleUserFilterChange(filterValue: CommentFilterOptions) {
  currentFilter.value = filterValue;
}

async function handleOpinionMuted() {
  // Use centralized refresh method to refetch all data
  await refreshData();
}

function handleOpinionDeleted() {
  emit("deleted");
  // TanStack Query mutation automatically handles cache invalidation
  updateOpinionList(currentFilter.value);
}

function changeVote(vote: VotingAction, opinionSlugId: string) {
  const previousMapSize = opinionVoteMap.value.size;

  // Handle vote changes internally using the agreement composable
  switch (vote) {
    case "agree":
      addOpinionAgreement(opinionSlugId, "agree");
      opinionVoteMap.value.set(opinionSlugId, "agree");
      break;
    case "disagree":
      addOpinionAgreement(opinionSlugId, "disagree");
      opinionVoteMap.value.set(opinionSlugId, "disagree");
      break;
    case "pass":
      addOpinionAgreement(opinionSlugId, "pass");
      opinionVoteMap.value.set(opinionSlugId, "pass");
      break;
    case "cancel": {
      // Find the original vote from the vote map to remove it
      const originalVote = opinionVoteMap.value.get(opinionSlugId);
      if (originalVote !== undefined) {
        removeOpinionAgreement(opinionSlugId, originalVote);
      }
      opinionVoteMap.value.delete(opinionSlugId);
      break;
    }
  }

  // Calculate participant count delta
  const currentMapSize = opinionVoteMap.value.size;
  const participantDelta = currentMapSize - previousMapSize;

  // Emit participant count changes to parent if any
  if (participantDelta !== 0) {
    emit("participantCountDelta", participantDelta);
  }
}

// Handle manual retry for failed API calls
function handleRetryLoadComments(): void {
  switch (currentFilter.value) {
    case "discover":
      void commentsDiscoverQuery.refetch();
      break;
    case "new":
      void commentsNewQuery.refetch();
      break;
    case "moderated":
      void commentsModeratedQuery.refetch();
      break;
    case "hidden":
      void hiddenCommentsQuery.refetch();
      break;
    default:
      void commentsDiscoverQuery.refetch();
      break;
  }
}

// Handle infinite scroll load event
function onLoad(index: number, done: () => void) {
  loadMore();
  done();
}

// Expose load more functionality for parent component
function triggerLoadMore() {
  loadMore();
}

async function refreshData(): Promise<void> {
  // Use utility function to invalidate all comment and analysis queries
  // This ensures fresh network requests regardless of staleTime
  invalidateAll(props.postSlugId);

  // Refresh user voting data to ensure vote map is current
  await fetchUserVotingData();

  // Update the current opinion list with fresh data
  updateOpinionList(currentFilter.value);
}

defineExpose({
  openModerationHistory,
  refreshAndHighlightOpinion,
  triggerLoadMore,
  changeVote,
  handleRetryLoadComments,
  refreshData,
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
