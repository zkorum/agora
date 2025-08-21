<template>
  <div>
    <WidthWrapper :enable="true">
      <q-pull-to-refresh @refresh="pullDownTriggered">
        <q-infinite-scroll
          v-if="isAuthInitialized"
          :offset="2000"
          :disable="!canLoadMore"
          @load="onLoad"
        >
          <div
            v-if="partialHomeFeedList.length == 0 && initializedFeed"
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

          <div>
            <div v-if="!initializedFeed" class="postListFlex">
              <div
                v-for="postData in emptyPostDataList"
                :key="postData.metadata.conversationSlugId"
              >
                <PostDetails
                  v-model="currentTab"
                  :conversation-data="postData"
                  :compact-mode="true"
                  class="showCursor"
                  @click="openPost(postData.metadata.conversationSlugId)"
                />
              </div>
            </div>

            <div
              v-if="initializedFeed && partialHomeFeedList.length > 0"
              class="postListFlex"
            >
              <div
                v-for="postData in partialHomeFeedList"
                :key="postData.metadata.conversationSlugId"
              >
                <PostDetails
                  v-model="currentTab"
                  :conversation-data="postData"
                  :compact-mode="true"
                  @click="openPost(postData.metadata.conversationSlugId)"
                />
              </div>
            </div>
          </div>

          <div
            v-if="initializedFeed && partialHomeFeedList.length > 0"
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

    <q-page-sticky
      v-if="hasPendingNewPosts"
      position="top"
      :offset="[0, 20]"
      @click="refreshPage(() => {})"
    >
      <ZKButton
        :button-type="'standardButton'"
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
import PostDetails from "../post/PostDetails.vue";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useWindowFocus, useWindowScroll } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useAuthenticationStore } from "src/stores/authentication";
import ZKButton from "../ui-library/ZKButton.vue";
import WidthWrapper from "../navigation/WidthWrapper.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  compactPostListTranslations,
  type CompactPostListTranslations,
} from "./CompactPostList.i18n";

const {
  partialHomeFeedList,
  emptyPostDataList,
  hasPendingNewPosts,
  initializedFeed,
  canLoadMore,
} = storeToRefs(useHomeFeedStore());
const { loadPostData, hasNewPostCheck, loadMore } = useHomeFeedStore();

const router = useRouter();

const windowFocused = useWindowFocus();

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

const { y: windowY } = useWindowScroll();

const currentTab = ref<"comment" | "analysis">("comment");

const { t } = useComponentI18n<CompactPostListTranslations>(
  compactPostListTranslations
);

onMounted(async () => {
  await hasNewPostCheck();
});

watch(windowFocused, async () => {
  if (windowFocused.value) {
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
      await loadPostData();
      canLoadMore.value = true;
      done();
    })();
  }, 500);
}

async function openPost(postSlugId: string) {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: postSlugId },
  });
}

async function refreshPage(done: () => void) {
  windowY.value = 0;

  canLoadMore.value = await loadPostData();

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
</style>
