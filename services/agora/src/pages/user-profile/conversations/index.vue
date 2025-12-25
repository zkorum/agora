<template>
  <div>
    <q-infinite-scroll :offset="2000" :disable="!canLoadMore" @load="onLoad">
      <div class="container">
        <PostListItem
          v-for="postData in profileData.userPostList"
          :key="postData.metadata.conversationSlugId"
          :conversation-data="postData"
        />
      </div>
    </q-infinite-scroll>

    <div
      v-if="profileData.dataLoaded && profileData.userPostList.length == 0"
      class="emptyMessage"
    >
      You have no conversations
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostListItem from "src/components/post/list/PostListItem.vue";
import { useUserStore } from "src/stores/user";
import { ref } from "vue";

const { loadMoreUserPosts } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const canLoadMore = ref(true);

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    const response = await loadMoreUserPosts();
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
