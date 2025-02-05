<template>
  <div>
    <div class="container">
      <div class="commentSectionToolbar">
        <div></div>

        <CommentSortingSelector
          :filter-value="sortAlgorithm"
          @changed-algorithm="(filterValue) => changeFilter(filterValue)"
        />
      </div>

      <!-- TODO: use the filtering algorithm but with sortAlgorithm==cluster.index -->

      <CommentGroup
        v-if="sortAlgorithm == 'discover'"
        :comment-item-list="commentItemsDiscover"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="commentSlugIdQuery"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="sortAlgorithm == 'new'"
        :comment-item-list="commentItemsNew"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="commentSlugIdQuery"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="sortAlgorithm == 'moderated'"
        :comment-item-list="commentItemsModerated"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="commentSlugIdQuery"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="sortAlgorithm == 'hidden'"
        :comment-item-list="commentItemsHidden"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="commentSlugIdQuery"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useBackendPolisApi } from "src/utils/api/polis";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  type ClusterMetadata,
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

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  isPostLocked: boolean;
}>();

const { profileData } = storeToRefs(useUserStore());

const commentSlugIdQuery = useRouteQuery("opinionSlugId", "", {
  transform: String,
});
const commentFilterQuery = useRouteQuery("filter", "", {
  transform: String,
});

const { showNotifyMessage } = useNotify();
const router = useRouter();

const sortAlgorithm = ref<CommentFilterOptions>("discover");
updateCommentFilter();

const { getPolisClustersInfo } = useBackendPolisApi();
const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

let commentItemsNew = ref<OpinionItem[]>([]);
let commentItemsDiscover = ref<OpinionItem[]>([]);
let commentItemsModerated = ref<OpinionItem[]>([]);
let commentItemsHidden = ref<OpinionItem[]>([]);

let clusters = ref<ClusterMetadata[]>([]);

const commentSlugIdLikedMap = ref<Map<string, "agree" | "disagree">>(new Map());

onMounted(async () => {
  await Promise.all([initializeData(), fetchPersonalLikes()]);
});

watch(commentFilterQuery, () => {
  updateCommentFilter();
});

async function selectedNewFilter(optionValue: CommentFilterOptions) {
  await router.replace({
    query: { filter: optionValue },
  });
  sortAlgorithm.value = optionValue;
}

function updateCommentFilter() {
  if (
    commentFilterQuery.value == "new" ||
    commentFilterQuery.value == "moderated" ||
    commentFilterQuery.value == "discover" ||
    commentFilterQuery.value == "hidden"
  ) {
    sortAlgorithm.value = commentFilterQuery.value;
  } else {
    console.error(
      "Unknown comment filter detected: " + commentFilterQuery.value
    );
  }
}

async function initializeData() {
  await Promise.all([
    getClusters(),
    initializeModeratorMenu(),
    fetchCommentList("new"),
    fetchCommentList("discover"),
    fetchCommentList("moderated"),
  ]);

  await scrollToComment();
}

async function initializeModeratorMenu() {
  if (profileData.value.isModerator) {
    await fetchHiddenComments();
  }
}

async function mutedComment() {
  await initializeData();
}

async function deletedComment() {
  emit("deleted");
  await resetRouteParams();
  await initializeData();
}

async function resetRouteParams() {
  if (
    commentFilterQuery.value == "new" ||
    commentFilterQuery.value == "moderated" ||
    commentFilterQuery.value == "discover" ||
    commentFilterQuery.value == "hidden"
  ) {
    // clear the existing route params
    await selectedNewFilter(commentFilterQuery.value);
  } else {
    console.error(
      "Unknown comment filter detected: " + commentFilterQuery.value
    );
  }
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
      commentItemsHidden.value = response;
    }
  }
}

async function getClusters() {
  if (props.postSlugId.length > 0) {
    clusters.value = await getPolisClustersInfo(props.postSlugId);
  }
}

async function fetchCommentList(filter: CommentFeedFilter) {
  if (props.postSlugId.length > 0) {
    const response = await fetchCommentsForPost(props.postSlugId, filter);

    if (response != null) {
      switch (filter) {
        case "moderated":
          commentItemsModerated.value = response;
          break;
        case "new":
          commentItemsNew.value = response;
          break;
        case "discover":
          commentItemsDiscover.value = response;
          break;
      }
    }
  }
}

function autoDetectCommentFilter(
  commentSlugId: string
): CommentFilterOptions | "not_found" {
  for (const commentItem of commentItemsDiscover.value) {
    if (commentItem.opinionSlugId == commentSlugId) {
      return "discover";
    }
  }
  for (const commentItem of commentItemsNew.value) {
    if (commentItem.opinionSlugId == commentSlugId) {
      return "new";
    }
  }

  for (const commentItem of commentItemsModerated.value) {
    if (commentItem.opinionSlugId == commentSlugId) {
      return "moderated";
    }
  }

  if (!isAuthenticated.value) {
    showNotifyMessage("This opinion has been removed by the moderators");
    return "discover";
  } else {
    for (const commentItem of commentItemsHidden.value) {
      if (commentItem.opinionSlugId == commentSlugId) {
        return "hidden";
      }
    }
  }

  return "not_found";
}

async function scrollToComment() {
  if (commentSlugIdQuery.value != "") {
    const detectedFilter = autoDetectCommentFilter(commentSlugIdQuery.value);
    if (detectedFilter == "not_found") {
      showNotifyMessage("Opinion not found: " + commentSlugIdQuery.value);
      await resetRouteParams();
    } else {
      sortAlgorithm.value = detectedFilter;
      await router.replace({
        query: {
          opinionSlugId: commentSlugIdQuery.value,
          filter: sortAlgorithm.value,
        },
      });

      setTimeout(function () {
        const targetElement = document.getElementById(commentSlugIdQuery.value);

        if (targetElement != null) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else {
          console.log(
            "Failed to locate comment slug ID: " + commentSlugIdQuery.value
          );
        }
      }, 1000);
    }
  }
}

async function changeFilter(filterValue: CommentFilterOptions) {
  sortAlgorithm.value = filterValue;
  await resetRouteParams();
  commentFilterQuery.value = filterValue;
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.commentSectionToolbar {
  display: flex;
  justify-content: space-between;
}
</style>
