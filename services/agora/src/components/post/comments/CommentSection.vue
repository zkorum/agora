<template>
  <div>
    <div class="container">
      <div class="commentSectionToolbar">
        <div class="commentSortingSelector">
          <CommentSortingSelector
            :filter-value="sortAlgorithm"
            @changed-algorithm="
              (filterValue: CommentFilterOptions) => changeFilter(filterValue)
            "
          />
        </div>
      </div>

      <CommentGroup
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoading"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        :login-required-to-participate="props.loginRequiredToParticipate"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
        @change-vote="
          (vote: VotingAction, opinionSlugId: string) =>
            changeVote(vote, opinionSlugId)
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import type {
  ExtendedConversationPolis,
  PolisKey,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import { type CommentFeedFilter, type OpinionItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./group/CommentGroup.vue";
import { useNotify } from "src/utils/ui/notify";
import { useRouteQuery } from "@vueuse/router";
import CommentSortingSelector from "./group/CommentSortingSelector.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useUserStore } from "src/stores/user";
import { useOpinionScrollableStore } from "src/stores/opinionScrollable";

defineExpose({
  openModerationHistory,
});

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

const sortAlgorithm = ref<CommentFilterOptions>("discover");
const requestedCommentSlugId = ref("");

const { profileData } = storeToRefs(useUserStore());

const commentSlugIdQuery = useRouteQuery("opinion", "", {
  transform: String,
});
const commentFilterQuery = useRouteQuery("filter", "", {
  transform: String,
});

const { showNotifyMessage } = useNotify();

const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

const isLoadingCommentItemsNew = ref<boolean>(true);
const isLoadingCommentItemsDiscover = ref<boolean>(true);
const isLoadingCommentItemsModerated = ref<boolean>(true);
const isLoadingCommentItemsHidden = ref<boolean>(true);
const isLoadingCommentItemsCluster = ref<boolean>(true);

// Computed properties for the unified CommentGroup component
const isLoading = computed(() => {
  switch (sortAlgorithm.value) {
    case "discover":
      return isLoadingCommentItemsDiscover.value;
    case "new":
      return isLoadingCommentItemsNew.value;
    case "moderated":
      return isLoadingCommentItemsModerated.value;
    case "hidden":
      return isLoadingCommentItemsHidden.value;
    default:
      return isLoadingCommentItemsDiscover.value;
  }
});

let commentItemsNew: OpinionItem[] = [];
let commentItemsDiscover: OpinionItem[] = [];
let commentItemsModerated: OpinionItem[] = [];
let commentItemsHidden: OpinionItem[] = [];

const clusterCommentItemsMap = ref<Map<PolisKey, OpinionItem[]>>(new Map());

const { setupOpinionlist, detectOpinionFilterBySlugId } =
  useOpinionScrollableStore();

let isMounted = false;

loadCommentFilterQuery();

function loadCommentModeToOpinionList() {
  updateInfiniteScrollingList(sortAlgorithm.value);
  requestedCommentSlugId.value = "";
}

onMounted(async () => {
  await Promise.all([initializeData(), fetchPersonalLikes()]);
  updateInfiniteScrollingList(sortAlgorithm.value);
  isMounted = true;
});

watch(sortAlgorithm, () => {
  if (!isMounted) {
    return;
  }
  loadCommentModeToOpinionList();
});

const showClusterMap = computed(() => {
  return props.polis.clusters.length >= 2;
});

function openModerationHistory() {
  sortAlgorithm.value = "moderated";
}

function updateInfiniteScrollingList(optionValue: CommentFilterOptions) {
  switch (optionValue) {
    case "new":
      setupOpinionlist(commentItemsNew, requestedCommentSlugId.value);
      break;
    case "discover":
      setupOpinionlist(commentItemsDiscover, requestedCommentSlugId.value);
      break;
    case "hidden":
      setupOpinionlist(commentItemsHidden, requestedCommentSlugId.value);
      break;
    case "moderated":
      setupOpinionlist(commentItemsModerated, requestedCommentSlugId.value);
      break;
  }
}

function loadCommentFilterQuery() {
  if (
    commentFilterQuery.value == "new" ||
    commentFilterQuery.value == "moderated" ||
    commentFilterQuery.value == "discover" ||
    commentFilterQuery.value == "hidden"
  ) {
    sortAlgorithm.value = commentFilterQuery.value;
  } else {
    sortAlgorithm.value = "discover";
  }
}

async function initializeData() {
  clusterCommentItemsMap.value.clear();

  await Promise.all(
    showClusterMap.value
      ? [
          getClusters(),
          initializeModeratorMenu(),
          fetchCommentList("new", undefined),
          fetchCommentList("discover", undefined),
          fetchCommentList("moderated", undefined),
        ]
      : [
          initializeModeratorMenu(),
          fetchCommentList("new", undefined),
          fetchCommentList("discover", undefined),
          fetchCommentList("moderated", undefined),
        ]
  );

  scrollToComment();
}

async function initializeModeratorMenu() {
  if (profileData.value.isModerator) {
    isLoadingCommentItemsHidden.value = true;
    await fetchHiddenComments();
    isLoadingCommentItemsHidden.value = false;
  }
}

async function mutedComment() {
  await initializeData();
}

async function deletedComment() {
  emit("deleted");
  await initializeData();
  updateInfiniteScrollingList(sortAlgorithm.value);
}

async function fetchPersonalLikes() {
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

async function fetchHiddenComments() {
  if (props.postSlugId.length > 0) {
    const response = await fetchHiddenCommentsForPost(props.postSlugId);

    if (response != null) {
      commentItemsHidden = response;
    }
  }
}

async function getClusters() {
  await Promise.all(
    props.polis.clusters.map(async (clusterItem) => {
      await fetchCommentList("cluster", clusterItem.key);
    })
  );
}

async function fetchCommentList(
  filter: CommentFeedFilter,
  clusterKey: PolisKey | undefined
) {
  if (props.postSlugId.length > 0) {
    switch (filter) {
      case "moderated":
        isLoadingCommentItemsModerated.value = true;
        break;
      case "new":
        isLoadingCommentItemsNew.value = true;
        break;
      case "discover":
        isLoadingCommentItemsDiscover.value = true;
        break;
      case "cluster":
        if (clusterKey != undefined) {
          isLoadingCommentItemsCluster.value = true;
        }
        break;
    }
    const response = await fetchCommentsForPost(
      props.postSlugId,
      filter,
      clusterKey
    );

    if (response != null) {
      switch (filter) {
        case "moderated":
          commentItemsModerated = response;
          isLoadingCommentItemsModerated.value = false;
          break;
        case "new":
          commentItemsNew = response;
          isLoadingCommentItemsNew.value = false;
          break;
        case "discover":
          commentItemsDiscover = response;
          isLoadingCommentItemsDiscover.value = false;
          break;
        case "cluster":
          if (clusterKey != undefined) {
            clusterCommentItemsMap.value.set(clusterKey, response);
            isLoadingCommentItemsCluster.value = false;
          }
          break;
      }
    }
  }
}

function scrollToComment() {
  requestedCommentSlugId.value = commentSlugIdQuery.value;
  if (requestedCommentSlugId.value != "") {
    const detectedFilter = detectOpinionFilterBySlugId(
      commentSlugIdQuery.value,
      commentItemsNew,
      commentItemsDiscover,
      commentItemsModerated,
      commentItemsHidden
    );

    if (detectedFilter == "not_found") {
      showNotifyMessage("Opinion not found: " + requestedCommentSlugId.value);
    } else {
      sortAlgorithm.value = detectedFilter;

      setTimeout(function () {
        const targetElement = document.getElementById(
          requestedCommentSlugId.value
        );

        if (targetElement != null) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else {
          console.log(
            "Failed to locate comment slug ID: " + requestedCommentSlugId.value
          );
        }
      }, 1000);
    }
  }
}

function changeFilter(filterValue: CommentFilterOptions) {
  sortAlgorithm.value = filterValue;
}

function changeVote(vote: VotingAction, opinionSlugId: string) {
  emit("changeVote", vote, opinionSlugId);
}
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

.clusterTabSelector {
  padding-bottom: 0.5rem;
}

.clusterTabUnderline {
  text-decoration-line: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.5rem;
}
</style>
