<template>
  <div>
    <q-infinite-scroll :offset="2000" :disable="!canLoadMore" @load="onLoad">
      <div class="container">
        <div
          v-for="postData in profileData.userPostList"
          :key="postData.metadata.conversationSlugId"
        >
          <PostDetails
            :extended-post-data="postData"
            :compact-mode="true"
            class="showCursor"
            @click="openPost(postData.metadata.conversationSlugId)"
          />
        </div>
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
import { useUserStore } from "src/stores/user";
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import PostDetails from "src/components/post/PostDetails.vue";

const { loadMoreUserPosts } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const canLoadMore = ref(true);

const router = useRouter();

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    const response = await loadMoreUserPosts();
    canLoadMore.value = !response.reachedEndOfFeed;
  }
  done();
}

async function openPost(postSlugId: string) {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: postSlugId },
  });
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
