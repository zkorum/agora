<template>
  <div>
    <div class="container">
      <div class="filterResponseBox">
        <div>Filter responses by:</div>
        <div class="filterButtonCluster">
          <ZKButton
            v-for="option in filterOptions"
            :key="option.value"
            :label="option.name"
            :color="selectedTab == option.value ? 'primary' : 'secondary'"
            @click="selectedTab = option.value"
          />
        </div>
      </div>

      <CommentGroup
        v-if="selectedTab == 'new'"
        :comment-item-list="commentItemsUnmoderated"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="initialCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
      />

      <CommentGroup
        v-if="selectedTab == 'moderation-history'"
        :comment-item-list="commentItemsModerated"
        :post-slug-id="postSlugId"
        :initial-comment-slug-id="initialCommentSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        @deleted="deletedComment()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import { type CommentItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./CommentGroup.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  initialCommentSlugId: string;
  isPostLocked: boolean;
}>();

const selectedTab = ref("new");

const { fetchCommentsForPost } = useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const commentItemsUnmoderated = ref<CommentItem[]>([]);
const commentItemsModerated = ref<CommentItem[]>([]);

const commentSlugIdLikedMap = ref<Map<string, "like" | "dislike">>(new Map());

const filterOptions = [
  { name: "New", value: "new" },
  { name: "Moderation History", value: "moderation-history" },
];

fetchCommentList(false);
fetchCommentList(true);

onMounted(() => {
  fetchPersonalLikes();
});

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

async function fetchCommentList(showModeratedComments: boolean) {
  if (props.postSlugId.length > 0) {
    const response = await fetchCommentsForPost(
      props.postSlugId,
      showModeratedComments
    );

    if (response != null) {
      if (showModeratedComments) {
        commentItemsModerated.value = response;
      } else {
        commentItemsUnmoderated.value = response;
      }

      setTimeout(function () {
        scrollToComment();
      }, 1000);
    }
  }
}

function scrollToComment() {
  if (props.initialCommentSlugId != "") {
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
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filterResponseBox {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.filterButtonCluster {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
</style>
