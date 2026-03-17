<template>
  <div>
    <ErrorRetryBlock
      v-if="profileData.postsLoadFailed"
      :title="t('errorTitle')"
      :retry-label="t('retryButton')"
      compact
      @retry="handleRetry"
    />

    <template v-else>
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
        {{ t("emptyConversations") }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostListItem from "src/components/post/list/PostListItem.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useUserStore } from "src/stores/user";
import { ref } from "vue";

import {
  type UserProfileTranslations,
  userProfileTranslations,
} from "../../user-profile.i18n";

const { t } = useComponentI18n<UserProfileTranslations>(
  userProfileTranslations
);

const { loadMoreUserPosts, retryUserPosts } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const canLoadMore = ref(true);

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    const response = await loadMoreUserPosts();
    canLoadMore.value = !response.reachedEndOfFeed;
  }
  done();
}

async function handleRetry() {
  await retryUserPosts();
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
