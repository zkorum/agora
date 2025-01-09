<template>
  <div>
    <div class="container">
      <div class="filterButtonCluster">
        <ZKButton
          v-for="option in filterOptions"
          :key="option.value"
          :label="option.name"
          :color="sortAlgorithm == option.value ? 'primary' : 'secondary'"
          :text-color="sortAlgorithm == option.value ? 'white' : 'primary'"
          @click="sortAlgorithm = option.value"
        />
      </div>

      <CommentGroup
        v-if="sortAlgorithm == 'new'"
        :comment-item-list="commentItemsNew"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="initialCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="sortAlgorithm == 'moderated'"
        :comment-item-list="commentItemsModerated"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="initialCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <CommentGroup
        v-if="sortAlgorithm == 'hidden'"
        :comment-item-list="commentItemsHidden"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="initialCommentSlugId"
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
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import { type CommentFeedFilter, type CommentItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./CommentGroup.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useUserStore } from "src/stores/user";
import { useNotify } from "src/utils/ui/notify";

type CommentFilterOptions = "new" | "moderated" | "hidden";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  initialCommentSlugId: string;
  isPostLocked: boolean;
  commentFilter: CommentFilterOptions;
}>();

const { showNotifyMessage } = useNotify();

const sortAlgorithm = ref<CommentFilterOptions>("new");
sortAlgorithm.value = props.commentFilter;

const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const { profileData } = storeToRefs(useUserStore());

let commentItemsNew = ref<CommentItem[]>([]);
let commentItemsModerated = ref<CommentItem[]>([]);
let commentItemsHidden = ref<CommentItem[]>([]);

const commentSlugIdLikedMap = ref<Map<string, "like" | "dislike">>(new Map());

const baseFilters: { name: string; value: CommentFilterOptions }[] = [
  { name: "New", value: "new" },
  { name: "Moderation History", value: "moderated" },
];
const filterOptions = ref(baseFilters);

onMounted(() => {
  initializeData();
  fetchPersonalLikes();
});

watch(profileData, () => {
  initializeModeratorMenu();
});

async function initializeData() {
  initializeModeratorMenu();
  await Promise.all([fetchCommentList("new"), fetchCommentList("moderated")]);

  scrollToComment();
}

function initializeModeratorMenu() {
  if (profileData.value.isModerator) {
    filterOptions.value = baseFilters.concat([
      {
        name: "⚔️ Hidden",
        value: "hidden",
      },
    ]);

    fetchHiddenComments();
  }
}

function mutedComment() {
  initializeData();
}

function deletedComment() {
  emit("deleted");
}

async function fetchPersonalLikes() {
  if (isAuthenticated.value) {
    commentSlugIdLikedMap.value.clear();
    const response = await fetchUserVotesForPostSlugIds([props.postSlugId]);
    if (response) {
      response.forEach((userVote) => {
        commentSlugIdLikedMap.value.set(
          userVote.commentSlugId,
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

async function fetchCommentList(filter: CommentFeedFilter) {
  if (props.postSlugId.length > 0) {
    const response = await fetchCommentsForPost(props.postSlugId, filter);

    if (response != null) {
      if (filter == "moderated") {
        commentItemsModerated.value = response;
      } else {
        commentItemsNew.value = response;
      }
    }
  }
}

function getCommentStatus(commentSlugId: string): CommentFilterOptions {
  for (const commentItem of commentItemsNew.value) {
    if (commentItem.commentSlugId == commentSlugId) {
      return "new";
    }
  }

  for (const commentItem of commentItemsModerated.value) {
    if (commentItem.commentSlugId == commentSlugId) {
      return "moderated";
    }
  }

  if (!isAuthenticated.value) {
    showNotifyMessage("This comment had been removed by the moderator");
    return "new";
  } else {
    return "hidden";
  }
}

async function scrollToComment() {
  if (props.initialCommentSlugId != "") {
    sortAlgorithm.value = getCommentStatus(props.initialCommentSlugId);

    setTimeout(function () {
      const targetElement = document.getElementById(props.initialCommentSlugId);

      if (targetElement != null) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else {
        console.log(
          "Failed to locate comment slug ID: " + props.initialCommentSlugId
        );
      }
    }, 1000);
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filterButtonCluster {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
</style>
