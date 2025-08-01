<template>
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
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoading"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="highlightedOpinionId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        :login-required-to-participate="props.loginRequiredToParticipate"
        @deleted="handleCommentDeleted()"
        @muted-comment="handleCommentMuted()"
        @change-vote="
          (vote: VotingAction, opinionSlugId: string) =>
            changeVote(vote, opinionSlugId)
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from "vue";
import type { CommentTabFilters } from "src/utils/api/comment";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import type {
  ExtendedConversationPolis,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import { type OpinionItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./group/CommentGroup.vue";
import { useNotify } from "src/utils/ui/notify";
import { useRouteQuery } from "@vueuse/router";
import { useRouter, useRoute } from "vue-router";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useUserStore } from "src/stores/user";
import { useOpinionScrollableStore } from "src/stores/opinionScrollable";

const emit = defineEmits([
  "deleted",
  "changeVote",
  "updateCommentSlugIdLikedMap",
]);

const props = defineProps<{
  postSlugId: string;
  polis: ExtendedConversationPolis;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
  opinionItemListPartial: OpinionItem[];
  commentSlugIdLikedMap: Map<string, VotingOption>;
}>();

const currentFilter = ref<CommentFilterOptions>("discover");
const highlightedOpinionId = ref("");
const isComponentMounted = ref(false);
const isHighlightingInProgress = ref(false);

const { profileData } = storeToRefs(useUserStore());
const router = useRouter();
const route = useRoute();
const commentSlugIdQuery = useRouteQuery("opinion", "", {
  transform: String,
});
const { showNotifyMessage } = useNotify();
const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
const { setupOpinionlist, detectOpinionFilterBySlugId } =
  useOpinionScrollableStore();

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
  setupOpinionlist(opinionData, highlightedOpinionId.value);
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
      emit("updateCommentSlugIdLikedMap", newMap);
    } else {
      emit("updateCommentSlugIdLikedMap", new Map());
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
  const opinionSlugId = commentSlugIdQuery.value;
  if (opinionSlugId && opinionSlugId.trim() !== "") {
    await highlightOpinionAndScroll(opinionSlugId);
  }
}

async function highlightOpinionAndScroll(opinionSlugId: string) {
  console.log("Highlighting opinion:", opinionSlugId);

  if (opinionSlugId === "") {
    return;
  }

  const targetFilter = detectOpinionFilterBySlugId(
    opinionSlugId,
    opinionsNew,
    opinionsDiscover,
    opinionsModerated,
    opinionsHidden
  );

  if (targetFilter === "not_found") {
    showNotifyMessage("Opinion not found: " + opinionSlugId);
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

async function handleCommentMuted() {
  await initializeOpinionData();
}

async function handleCommentDeleted() {
  emit("deleted");
  await initializeOpinionData();
  updateOpinionList(currentFilter.value);
}

function changeVote(vote: VotingAction, opinionSlugId: string) {
  emit("changeVote", vote, opinionSlugId);
}

defineExpose({
  openModerationHistory,
  refreshAndHighlightOpinion,
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
