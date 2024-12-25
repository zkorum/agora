<template>
  <div>
    <div class="container">
      <CommentSortSelector
        @changed-algorithm="(value) => (commentSortPreference = value)"
      />

      <div
        v-if="commentItems.length == 0 && commentSortPreference != 'clusters'"
        class="noCommentMessage"
      >
        There are no opinions in this conservation.
      </div>

      <div v-if="commentItems.length > 0" class="commentListFlex">
        <div
          v-for="commentItem in commentItems"
          :id="commentItem.commentSlugId"
          :key="commentItem.commentSlugId"
        >
          <CommentSingle
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :highlight="initialCommentSlugId == commentItem.commentSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
            @deleted="deletedComment()"
          />

          <Divider :style="{ width: '100%' }" />
        </div>
      </div>

      <div
        v-if="commentSortPreference == 'clusters'"
        :style="{ paddingTop: '1rem' }"
      >
        <ZKCard padding="2rem">
          <div class="specialMessage">
            <img src="/development/polis/example.png" class="polisExampleImg" />
            <div class="specialText">
              This visualization is currently a work-in-progress!
            </div>
          </div>
        </ZKCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentSingle from "./CommentSingle.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { onMounted, ref } from "vue";
import Divider from "primevue/divider";
import CommentSortSelector from "./CommentSortSelector.vue";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import { type CommentItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  initialCommentSlugId: string;
  isPostLocked: boolean;
}>();

const commentSortPreference = ref("");

const { fetchCommentsForPost } = useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const commentItems = ref<CommentItem[]>([]);

const commentSlugIdLikedMap = ref<Map<string, "like" | "dislike">>(new Map());

fetchCommentList();

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

async function fetchCommentList() {
  if (props.postSlugId.length > 0) {
    const response = await fetchCommentsForPost(props.postSlugId);

    if (response != null) {
      commentItems.value = response;
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

.noCommentMessage {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}

.specialMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.commentListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.polisExampleImg {
  width: 100%;
  border-radius: 15px;
}

.specialText {
  text-align: center;
  width: min(15rem, 100%);
}
</style>
