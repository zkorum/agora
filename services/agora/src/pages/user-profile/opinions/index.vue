<template>
  <div>
    <q-infinite-scroll :offset="2000" :disable="!canLoadMore" @load="onLoad">
      <div class="container">
        <OpinionListItem
          v-for="commentItem in profileData.userCommentList"
          :key="commentItem.opinionItem.opinionSlugId"
          :conversation-slug-id="
            commentItem.conversationData.metadata.conversationSlugId
          "
          :conversation-title="commentItem.conversationData.payload.title"
          :is-indexed="commentItem.conversationData.metadata.isIndexed"
          :opinion-slug-id="commentItem.opinionItem.opinionSlugId"
          :opinion-item="commentItem.opinionItem"
        />
      </div>
    </q-infinite-scroll>

    <div
      v-if="profileData.dataLoaded && profileData.userCommentList.length == 0"
      class="emptyMessage"
    >
      You have no opinions
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import OpinionListItem from "src/components/post/list/OpinionListItem.vue";
import { useUserStore } from "src/stores/user";
import { ref } from "vue";

const { loadMoreUserComments } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const canLoadMore = ref(true);

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    const response = await loadMoreUserComments();
    canLoadMore.value = !response.reachedEndOfFeed;
  }
  done();
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.emptyMessage {
  padding: 2rem;
  text-align: center;
}
</style>
