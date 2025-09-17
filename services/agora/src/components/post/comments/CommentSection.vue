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

        <CommentGroup
          :comment-item-list="visibleOpinions"
          :is-loading="isLoading"
          :post-slug-id="postSlugId"
          :initial-comment-slug-id="highlightedOpinionId"
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
      </div>
    </div>
  </q-infinite-scroll>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from "vue";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import type { VotingAction, VotingOption } from "src/shared/types/zod";
import { type OpinionItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./group/CommentGroup.vue";
import { useNotify } from "src/utils/ui/notify";
import { useRouteQuery } from "@vueuse/router";
import { useRouter, useRoute } from "vue-router";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useUserStore } from "src/stores/user";
import { useOpinionScrollable } from "src/composables/ui/useOpinionScrollable";
import { useOpinionFiltering } from "src/composables/ui/useOpinionFiltering";
import { useOpinionAgreements } from "src/composables/ui/useOpinionAgreements";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
} from "src/composables/api/useCommentQueries";
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
const highlightedOpinionId = ref("");
const isComponentMounted = ref(false);
const isHighlightingInProgress = ref(false);

const { profileData } = storeToRefs(useUserStore());
const router = useRouter();
const route = useRoute();
const opinionSlugIdQuery = useRouteQuery("opinion", "", {
  transform: String,
});
const { showNotifyMessage } = useNotify();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { isGuestOrLoggedIn, isLoggedIn } = storeToRefs(useAuthenticationStore());

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

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

// Opinion filtering functionality
const { findOpinionFilter } = useOpinionFiltering();

// Internal vote map management
const opinionVoteMap = ref<Map<string, VotingOption>>(new Map());

// Computed loading states from TanStack Query
const isLoading = computed(() => {
  switch (currentFilter.value) {
    case "discover":
      return commentsDiscoverQuery.isPending.value;
    case "new":
      return commentsNewQuery.isPending.value;
    case "moderated":
      return commentsModeratedQuery.isPending.value;
    case "hidden":
      return hiddenCommentsQuery.isPending.value;
    default:
      return commentsDiscoverQuery.isPending.value;
  }
});

// Computed data from TanStack Query
const opinionsNew = computed(() => commentsNewQuery.data.value || []);
const opinionsDiscover = computed(() => commentsDiscoverQuery.data.value || []);
const opinionsModerated = computed(
  () => commentsModeratedQuery.data.value || []
);
const opinionsHidden = computed(() => hiddenCommentsQuery.data.value || []);

// Watch for when query data becomes available after mount
watch(opinionsDiscover, (newData, oldData) => {
  if (!isComponentMounted.value || !newData) {
    return;
  }
  // Only trigger if this is the active filter and data has actually changed
  if (currentFilter.value === "discover" && newData !== oldData) {
    updateOpinionList("discover");
  }
});

watch(opinionsNew, (newData, oldData) => {
  if (!isComponentMounted.value || !newData) {
    return;
  }
  if (currentFilter.value === "new" && newData !== oldData) {
    updateOpinionList("new");
  }
});

watch(opinionsModerated, (newData, oldData) => {
  if (!isComponentMounted.value || !newData) {
    return;
  }
  if (currentFilter.value === "moderated" && newData !== oldData) {
    updateOpinionList("moderated");
  }
});

watch(opinionsHidden, (newData, oldData) => {
  if (!isComponentMounted.value || !newData) {
    return;
  }
  if (currentFilter.value === "hidden" && newData !== oldData) {
    updateOpinionList("hidden");
  }
});

watch(currentFilter, (newFilter) => {
  if (!isComponentMounted.value) {
    return;
  }

  updateOpinionList(newFilter);

  // Clear highlight after the list is updated (unless we're highlighting)
  if (highlightedOpinionId.value !== "" && !isHighlightingInProgress.value) {
    highlightedOpinionId.value = "";
  }
});

function updateOpinionList(filter: CommentFilterOptions) {
  const opinionData = getOpinionDataForFilter(filter);
  initializeOpinionList(opinionData, highlightedOpinionId.value);
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
    await highlightOpinionAndScroll(opinionSlugId);
  }
}

async function highlightOpinionAndScroll(opinionSlugId: string) {
  console.log("Highlighting opinion:", opinionSlugId);

  if (opinionSlugId === "") {
    return;
  }

  const targetFilter = findOpinionFilter(
    opinionSlugId,
    opinionsNew.value,
    opinionsDiscover.value,
    opinionsModerated.value,
    opinionsHidden.value,
    isLoggedIn.value,
    profileData.value.isModerator
  );

  if (targetFilter === "not_found") {
    showNotifyMessage(t("opinionNotFound") + " " + opinionSlugId);
    return;
  }

  if (targetFilter === "removed_by_moderators") {
    showNotifyMessage(t("opinionRemovedByModerators"));
    return;
  }

  // Set highlighting in progress to prevent the watcher from clearing the highlight
  isHighlightingInProgress.value = true;
  highlightedOpinionId.value = opinionSlugId;
  currentFilter.value = targetFilter;

  // Reset the flag after the watcher has processed the filter change
  await nextTick();
  isHighlightingInProgress.value = false;

  setTimeout(() => {
    scrollToOpinion(opinionSlugId);
  }, 1000);
}

function scrollToOpinion(opinionSlugId: string) {
  const targetElement = document.getElementById(opinionSlugId);

  if (targetElement != null) {
    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } else {
    console.log("Failed to locate opinion slug ID:", opinionSlugId);
  }
}

async function refreshAndHighlightOpinion(opinionSlugId: string) {
  // Invalidate TanStack Query caches to refetch data
  await Promise.all([
    commentsNewQuery.refetch(),
    commentsDiscoverQuery.refetch(),
    commentsModeratedQuery.refetch(),
  ]);

  await highlightOpinionAndScroll(opinionSlugId);

  updateOpinionList(currentFilter.value);
}

function openModerationHistory() {
  currentFilter.value = "moderated";
}

function handleUserFilterChange(filterValue: CommentFilterOptions) {
  highlightedOpinionId.value = "";
  currentFilter.value = filterValue;
}

async function handleOpinionMuted() {
  // Refetch all comment data since opinions may have moved between filters
  await Promise.all([
    commentsNewQuery.refetch(),
    commentsDiscoverQuery.refetch(),
    commentsModeratedQuery.refetch(),
    hiddenCommentsQuery.refetch(),
  ]);
}

async function handleOpinionDeleted() {
  emit("deleted");
  // Refetch all comment data since the deleted opinion should be removed
  await Promise.all([
    commentsNewQuery.refetch(),
    commentsDiscoverQuery.refetch(),
    commentsModeratedQuery.refetch(),
    hiddenCommentsQuery.refetch(),
  ]);
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

// Handle infinite scroll load event
function onLoad(index: number, done: () => void) {
  loadMore();
  done();
}

// Expose load more functionality for parent component
function triggerLoadMore() {
  loadMore();
}

defineExpose({
  openModerationHistory,
  refreshAndHighlightOpinion,
  triggerLoadMore,
  changeVote,
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
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
