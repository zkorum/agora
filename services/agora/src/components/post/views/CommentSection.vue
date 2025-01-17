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
          @click="selectedNewFilter(option.value)"
        />
      </div>

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
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { useAuthenticationStore } from "src/stores/authentication";
import { type CommentFeedFilter, type OpinionItem } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import CommentGroup from "./CommentGroup.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useUserStore } from "src/stores/user";
import { useNotify } from "src/utils/ui/notify";
import { useRouter } from "vue-router";
import { useRouteQuery } from "@vueuse/router";

type CommentFilterOptions = "new" | "moderated" | "hidden";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  postSlugId: string;
  isPostLocked: boolean;
}>();

const commentSlugIdQuery = useRouteQuery("opinionSlugId", "", {
  transform: String,
});
const commentFilterQuery = useRouteQuery("filter", "", {
  transform: String,
});

const { showNotifyMessage } = useNotify();
const router = useRouter();

const sortAlgorithm = ref<CommentFilterOptions>("new");
updateCommentFilter();

const { fetchCommentsForPost, fetchHiddenCommentsForPost } =
  useBackendCommentApi();
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const { profileData } = storeToRefs(useUserStore());

let commentItemsNew = ref<OpinionItem[]>([]);
let commentItemsModerated = ref<OpinionItem[]>([]);
let commentItemsHidden = ref<OpinionItem[]>([]);

const commentSlugIdLikedMap = ref<Map<string, "agree" | "disagree">>(new Map());

const baseFilters: { name: string; value: CommentFilterOptions }[] = [
  { name: "New", value: "new" },
  { name: "Moderation History", value: "moderated" },
];
const filterOptions = ref(baseFilters);

onMounted(async () => {
  await Promise.all([initializeData(), fetchPersonalLikes()]);
});

watch(commentFilterQuery, () => {
  updateCommentFilter();
});

watch(profileData, async () => {
  await initializeModeratorMenu();
});

async function selectedNewFilter(optionValue: CommentFilterOptions) {
  await router.replace({ query: { filter: optionValue } });
  sortAlgorithm.value = optionValue;
}

function updateCommentFilter() {
  if (
    commentFilterQuery.value == "new" ||
    commentFilterQuery.value == "moderated" ||
    commentFilterQuery.value == "hidden"
  ) {
    sortAlgorithm.value = commentFilterQuery.value;
  } else if (commentFilterQuery.value == "") {
    // do nothing keep the default value
  } else {
    console.log("Unknown comment filter detected: " + commentFilterQuery.value);
    return "new";
  }
}

async function initializeData() {
  await Promise.all([
    initializeModeratorMenu(),
    fetchCommentList("new"),
    fetchCommentList("moderated"),
  ]);

  await scrollToComment();
}

async function initializeModeratorMenu() {
  if (profileData.value.isModerator) {
    filterOptions.value = baseFilters.concat([
      {
        name: "⚔️ Hidden",
        value: "hidden",
      },
    ]);

    await fetchHiddenComments();
  }
}

async function mutedComment() {
  await initializeData();
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

function autoDetectCommentFilter(commentSlugId: string): CommentFilterOptions {
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
    showNotifyMessage("This comment had been removed by the moderator");
    return "new";
  } else {
    return "hidden";
  }
}

async function scrollToComment() {
  if (commentSlugIdQuery.value != "") {
    sortAlgorithm.value = autoDetectCommentFilter(commentSlugIdQuery.value);
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
