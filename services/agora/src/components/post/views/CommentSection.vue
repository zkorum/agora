<template>
  <div>
    <div class="container">
      <CommentClusterGraph
        v-if="showClusterMap"
        :clusters="polis.clusters"
        :total-participant-count="participantCount"
        :current-cluster-tab="currentClusterTab"
        @selected-cluster="(value: PolisKey) => toggleClusterSelection(value)"
      />

      <div class="commentSectionToolbar">
        <ClusterTabs
          v-model="currentClusterTab"
          :cluster-metadata-list="props.polis.clusters"
        />

        <div>
          <CommentSortingSelector
            v-if="currentClusterTab == 'all'"
            :filter-value="sortAlgorithm"
            @changed-algorithm="
              (filterValue: CommentFilterOptions) => changeFilter(filterValue)
            "
          />
        </div>
      </div>

      <CommentGroup
        v-if="currentClusterTab == 'all' && sortAlgorithm == 'discover'"
        :selected-cluster-key="undefined"
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoadingCommentItemsDiscover"
        :post-slug-id="postSlugId"
        :ai-summary="polis.aiSummary"
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="currentClusterTab == 'all' && sortAlgorithm == 'new'"
        :selected-cluster-key="undefined"
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoadingCommentItemsNew"
        :post-slug-id="postSlugId"
        :ai-summary="polis.aiSummary"
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="currentClusterTab == 'all' && sortAlgorithm == 'moderated'"
        :selected-cluster-key="undefined"
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoadingCommentItemsModerated"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="currentClusterTab == 'all' && sortAlgorithm == 'hidden'"
        :selected-cluster-key="undefined"
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoadingCommentItemsHidden"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="currentClusterTab != 'all'"
        :selected-cluster-key="currentClusterTab"
        :comment-item-list="opinionItemListPartial"
        :is-loading="isLoadingCommentItemsCluster"
        :post-slug-id="postSlugId"
        :ai-summary="
          parseInt(currentClusterTab) in polis.clusters
            ? polis.clusters[parseInt(currentClusterTab)].aiSummary
            : undefined
        "
        :initial-comment-slug-id="requestedCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  ExtendedConversationPolis,
  PolisKey,
  type CommentFeedFilter,
  type OpinionItem,
} from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./CommentGroup.vue";
import { useNotify } from "src/utils/ui/notify";
import { useRouter } from "vue-router";
import { useRouteQuery } from "@vueuse/router";
import CommentSortingSelector from "./CommentSortingSelector.vue";
import { CommentFilterOptions } from "src/utils/component/opinion";
import { useUserStore } from "src/stores/user";
import CommentClusterGraph from "./CommentClusterGraph.vue";
import { useOpinionScrollableStore } from "src/stores/opinionScrollable";
import ClusterTabs from "./cluster/ClusterTabs.vue";

defineExpose({
  openModerationHistory,
});

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  participantCount: number;
  polis: ExtendedConversationPolis;
  isPostLocked: boolean;
}>();

const sortAlgorithm = ref<CommentFilterOptions>("discover");
const requestedCommentSlugId = ref("");

const currentClusterTab = ref<PolisKey | "all">("all");

const { profileData } = storeToRefs(useUserStore());

const commentSlugIdQuery = useRouteQuery("opinionSlugId", "", {
  transform: String,
});
const commentFilterQuery = useRouteQuery("filter", "", {
  transform: String,
});

const { showNotifyMessage } = useNotify();
const router = useRouter();

loadCommentFilterQuery();

const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const isLoadingCommentItemsNew = ref<boolean>(true);
const isLoadingCommentItemsDiscover = ref<boolean>(true);
const isLoadingCommentItemsModerated = ref<boolean>(true);
const isLoadingCommentItemsHidden = ref<boolean>(true);
const isLoadingCommentItemsCluster = ref<boolean>(true);
let commentItemsNew: OpinionItem[] = [];
let commentItemsDiscover: OpinionItem[] = [];
let commentItemsModerated: OpinionItem[] = [];
let commentItemsHidden: OpinionItem[] = [];

const clusterCommentItemsMap = ref<Map<PolisKey, OpinionItem[]>>(new Map());
const commentSlugIdLikedMap = ref<Map<string, "agree" | "disagree">>(new Map());

const { setupOpinionlist, detectOpinionFilterBySlugId } =
  useOpinionScrollableStore();
const { opinionItemListPartial } = storeToRefs(useOpinionScrollableStore());

onMounted(async () => {
  await Promise.all([initializeData(), fetchPersonalLikes()]);
  updateInfiniteScrollingList(sortAlgorithm.value);
  await resetRouteParams();
});

watch(sortAlgorithm, () => {
  requestedCommentSlugId.value = "";
  updateInfiniteScrollingList(sortAlgorithm.value);
});

watch(currentClusterTab, async () => {
  requestedCommentSlugId.value = "";
  if (currentClusterTab.value !== "all") {
    const clusterKey = currentClusterTab.value;
    const cachedCommentItems = clusterCommentItemsMap.value.get(clusterKey);
    if (cachedCommentItems) {
      setupOpinionlist(cachedCommentItems, requestedCommentSlugId.value);
    } else {
      setupOpinionlist([], requestedCommentSlugId.value);
      console.error(
        `Failed to locate comment items for cluster key: ${clusterKey}`
      );
    }
  } else {
    updateInfiniteScrollingList(sortAlgorithm.value);
  }
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
    default:
      console.error("Unknown sort algorithm: " + sortAlgorithm.value);
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

  await Promise.all([
    getClusters(),
    initializeModeratorMenu(),
    fetchCommentList("new", undefined),
    fetchCommentList("discover", undefined),
    fetchCommentList("moderated", undefined),
  ]);

  await scrollToComment();
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

async function resetRouteParams() {
  await router.replace({
    query: {},
  });
}

async function fetchPersonalLikes() {
  if (isAuthenticated.value) {
    commentSlugIdLikedMap.value.clear();
    const response = await fetchUserVotesForPostSlugIds([props.postSlugId]);
    if (response) {
      response.forEach((userVote) => {
        commentSlugIdLikedMap.value.set(
          userVote.opinionSlugId,
          userVote.votingAction
        );
      });
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

async function scrollToComment() {
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

async function changeFilter(filterValue: CommentFilterOptions) {
  sortAlgorithm.value = filterValue;
}

function toggleClusterSelection(clusterKey: PolisKey) {
  if (currentClusterTab.value == clusterKey) {
    currentClusterTab.value = "all";
  } else {
    currentClusterTab.value = clusterKey;
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.commentSectionToolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  align-items: end;
  justify-content: space-between;
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
