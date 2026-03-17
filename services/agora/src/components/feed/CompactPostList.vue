<template>
  <div>
    <WidthWrapper :enable="true">
      <q-pull-to-refresh @refresh="pullDownTriggered">
        <FeedSkeleton v-if="isPending" />
        <q-infinite-scroll
          v-else
          :offset="2000"
          :disable="!canLoadMore"
          @load="onLoad"
        >
          <div
            v-if="isError"
            class="emptyDivPadding"
          >
            <div class="centerMessage">
              <div>
                <q-icon name="mdi-alert-circle-outline" size="4rem" />
              </div>

              <div :style="{ fontSize: '1.3rem' }">
                {{ t("emptyStateTitle") }}
              </div>

              <ZKButton
                button-type="standardButton"
                color="primary"
                no-caps
                unelevated
                size="lg"
                :label="t('retryButton')"
                @click="refetch()"
              />
            </div>
          </div>

          <div
            v-else-if="partialHomeFeedList.length == 0"
            class="emptyDivPadding"
          >
            <div class="centerMessage">
              <div>
                <q-icon name="mdi-account-group" size="4rem" />
              </div>

              <div :style="{ fontSize: '1.3rem' }">
                {{ t("emptyStateTitle") }}
              </div>

              <div>
                {{ t("emptyStateDescription") }}
                <q-icon name="mdi-plus-circle" /> button.
              </div>
            </div>
          </div>

          <div v-else>
            <!-- Loading indicator for tab switches -->
            <div
              v-if="isFetching"
              class="centerMessage loading-indicator"
            >
              <q-spinner-dots size="4rem" color="primary" />
            </div>

            <div
              class="postListFlex"
              :class="{ 'loading-overlay': isFetching }"
            >
              <PostListItem
                v-for="postData in partialHomeFeedList"
                :key="postData.metadata.conversationSlugId"
                :conversation-data="postData"
              />
            </div>
          </div>

          <div
            v-if="!isError && partialHomeFeedList.length > 0"
            class="centerMessage"
          >
            <div>
              <q-icon name="mdi-check" size="4rem" />
            </div>

            <div :style="{ fontSize: '1.3rem' }">{{ t("completedTitle") }}</div>

            <div>{{ t("completedDescription") }}</div>
          </div>
        </q-infinite-scroll>
      </q-pull-to-refresh>
    </WidthWrapper>

    <!-- @vue-expect-error Quasar q-page-sticky doesn't type onClick event handler -->
    <q-page-sticky
      v-if="hasPendingNewPosts && !isPending"
      position="top"
      :offset="[0, 20]"
      @click="refreshPage(() => {})"
    >
      <ZKButton
        button-type="standardButton"
        rounded
        color="primary"
        no-caps
        unelevated
      >
        <div class="newConversationIcon">
          <q-icon name="mdi-arrow-up" />
          <div>{{ t("newConversationsButton") }}</div>
        </div>
      </ZKButton>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { useDocumentVisibility, useWindowScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useFeedQuery } from "src/utils/api/post/useFeedQuery";
import { onMounted, watch } from "vue";

import WidthWrapper from "../navigation/WidthWrapper.vue";
import PostListItem from "../post/list/PostListItem.vue";
import ZKButton from "../ui-library/ZKButton.vue";
import {
  type CompactPostListTranslations,
  compactPostListTranslations,
} from "./CompactPostList.i18n";
import FeedSkeleton from "./FeedSkeleton.vue";

const {
  partialHomeFeedList,
  hasPendingNewPosts,
  canLoadMore,
} = storeToRefs(useHomeFeedStore());
const { hasNewPostCheck, loadMore, setFeedData } = useHomeFeedStore();

const documentVisibility = useDocumentVisibility();

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

const { y: windowY } = useWindowScroll();

const { t } = useComponentI18n<CompactPostListTranslations>(
  compactPostListTranslations
);

const { data, isPending, isFetching, isError, refetch } = useFeedQuery({
  enabled: isAuthInitialized,
});

watch(data, (newData) => {
  if (newData) {
    setFeedData(newData);
  }
});

onMounted(async () => {
  await hasNewPostCheck();
});

watch(documentVisibility, async () => {
  if (documentVisibility.value === "visible") {
    await hasNewPostCheck();
  }
});

function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    canLoadMore.value = loadMore();
  }
  done();
}

function pullDownTriggered(done: () => void) {
  setTimeout(() => {
    void (async () => {
      await refetch();
      canLoadMore.value = true;
      done();
    })();
  }, 500);
}

async function refreshPage(done: () => void) {
  windowY.value = 0;

  await refetch();
  canLoadMore.value = true;

  setTimeout(() => {
    done();
  }, 500);
}
</script>

<style scoped lang="scss">
.postListFlex {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.emptyDivPadding {
  padding-top: 5rem;
}

.centerMessage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 8rem;
  padding-bottom: 8rem;
  flex-direction: column;
}

.newConversationIcon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-overlay {
  opacity: 0.5;
  pointer-events: none;
}

.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}
</style>
