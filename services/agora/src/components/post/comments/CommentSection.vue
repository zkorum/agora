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
import type { CommentTabFilters } from "src/utils/api/comment";
import { useBackendCommentApi } from "src/utils/api/comment";
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
import { useOpinionScrollable } from "src/composables/useOpinionScrollable";
import { useOpinionFiltering } from "src/composables/useOpinionFiltering";
import { useOpinionAgreements } from "src/composables/useOpinionAgreements";
import { useComponentI18n } from "src/composables/useComponentI18n";
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
const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { isGuestOrLoggedIn, isLoggedIn } = storeToRefs(useAuthenticationStore());

const { t } = useComponentI18n<CommentSectionTranslations>(
  commentSectionTranslations
);

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

const isLoadingNew = ref<boolean>(true);
const isLoadingDiscover = ref<boolean>(true);
const isLoadingModerated = ref<boolean>(true);
const isLoadingHidden = ref<boolean>(true);

const isLoading = computed(() => {
  switch (currentFilter.value) {
    case "discover":
      return isLoadingDiscover.value;
    case "new":
      return isLoadingNew.value;
    case "moderated":
      return isLoadingModerated.value;
    case "hidden":
      return isLoadingHidden.value;
    default:
      return isLoadingDiscover.value;
  }
});

let opinionsNew: OpinionItem[] = [];
let opinionsDiscover: OpinionItem[] = [];
let opinionsModerated: OpinionItem[] = [];
let opinionsHidden: OpinionItem[] = [];

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
      return opinionsNew;
    case "discover":
      return opinionsDiscover;
    case "hidden":
      return opinionsHidden;
    case "moderated":
      return opinionsModerated;
    default:
      return opinionsDiscover;
  }
}

onMounted(async () => {
  await Promise.all([initializeOpinionData(), fetchUserVotingData()]);

  await setupHighlightFromRoute();

  await clearRouteQueryParameters();

  updateOpinionList(currentFilter.value);

  isComponentMounted.value = true;
});

async function initializeOpinionData() {
  await Promise.all([
    initializeModeratorData(),
    fetchOpinionList("new"),
    fetchOpinionList("discover"),
    fetchOpinionList("moderated"),
  ]);
}

async function initializeModeratorData() {
  if (profileData.value.isModerator) {
    isLoadingHidden.value = true;
    await fetchHiddenOpinions();
    isLoadingHidden.value = false;
  }
}

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

async function fetchHiddenOpinions() {
  if (props.postSlugId.length > 0) {
    const response = await fetchHiddenCommentsForPost(props.postSlugId);
    if (response != null) {
      opinionsHidden = response;
    }
  }
}

async function fetchOpinionList(filter: CommentTabFilters) {
  if (props.postSlugId.length === 0) {
    return;
  }

  setLoadingStateForFilter(filter, true);

  const response = await fetchCommentsForPost(
    props.postSlugId,
    filter,
    undefined
  );

  if (response != null) {
    switch (filter) {
      case "moderated":
        opinionsModerated = response;
        break;
      case "new":
        opinionsNew = response;
        break;
      case "discover":
        opinionsDiscover = response;
        break;
      case "hidden":
        opinionsHidden = response;
        break;
    }
  }

  setLoadingStateForFilter(filter, false);
}

function setLoadingStateForFilter(
  filter: CommentTabFilters,
  isLoading: boolean
) {
  switch (filter) {
    case "moderated":
      isLoadingModerated.value = isLoading;
      break;
    case "new":
      isLoadingNew.value = isLoading;
      break;
    case "discover":
      isLoadingDiscover.value = isLoading;
      break;
    case "hidden":
      isLoadingHidden.value = isLoading;
      break;
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
    opinionsNew,
    opinionsDiscover,
    opinionsModerated,
    opinionsHidden,
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
  await Promise.all([
    fetchOpinionList("new"),
    fetchOpinionList("discover"),
    fetchOpinionList("moderated"),
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
  await initializeOpinionData();
}

async function handleOpinionDeleted() {
  emit("deleted");
  await initializeOpinionData();
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
