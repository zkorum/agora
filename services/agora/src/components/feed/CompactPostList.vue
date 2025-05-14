<template>
  <div>
    <WidthWrapper :enable="true">
      <q-pull-to-refresh @refresh="pullDownTriggered">
        <div class="tabCluster">
          <div class="tabItem" @click="selectedTab('following')">
            <ZKTab
              :text="isLoggedIn ? 'Following' : 'Popular'"
              :is-highlighted="currentHomeFeedTab === 'following'"
              :show-underline="false"
            />
          </div>

          <div class="tabItem" @click="selectedTab('new')">
            <ZKTab
              text="New"
              :is-highlighted="currentHomeFeedTab === 'new'"
              :show-underline="false"
            />
          </div>
        </div>

        <div :style="{ height: '0.5rem' }"></div>

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

              <div :style="{ fontSize: '1.3rem' }">It is too quiet here...</div>

              <div>
                Create a new conversation using the
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
                  :extended-post-data="postData"
                  :compact-mode="true"
                  :show-comment-section="false"
                  :skeleton-mode="true"
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
                  :extended-post-data="postData"
                  :compact-mode="true"
                  :show-comment-section="false"
                  :skeleton-mode="false"
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

            <div :style="{ fontSize: '1.3rem' }">You're all caught up</div>

            <div>You have seen all the new conversations.</div>
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
          <div>New conversations</div>
        </div>
      </ZKButton>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import PostDetails from "../post/PostDetails.vue";
import { HomeFeedSortOption, useHomeFeedStore } from "src/stores/homeFeed";
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useWindowFocus, useWindowScroll } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useAuthenticationStore } from "src/stores/authentication";
import ZKButton from "../ui-library/ZKButton.vue";
import WidthWrapper from "../navigation/WidthWrapper.vue";
import ZKTab from "../ui-library/ZKTab.vue";

const {
  partialHomeFeedList,
  emptyPostDataList,
  hasPendingNewPosts,
  initializedFeed,
  currentHomeFeedTab,
  canLoadMore,
} = storeToRefs(useHomeFeedStore());
const { loadPostData, hasNewPostCheck, loadMore } = useHomeFeedStore();

const router = useRouter();

const windowFocused = useWindowFocus();

const { isAuthInitialized, isLoggedIn } = storeToRefs(useAuthenticationStore());

const { y: windowY } = useWindowScroll();

onMounted(async () => {
  await hasNewPostCheck();
});

watch(windowFocused, async () => {
  if (windowFocused.value) {
    await hasNewPostCheck();
  }
});

function selectedTab(tab: HomeFeedSortOption) {
  currentHomeFeedTab.value = tab;
}

function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    canLoadMore.value = loadMore();
  }
  done();
}

async function pullDownTriggered(done: () => void) {
  setTimeout(async () => {
    await loadPostData();
    canLoadMore.value = true;
    done();
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

<style scoped>
.postListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.tabCluster {
  display: grid;
  grid-template-columns: 50% 50%;
  grid-template-rows: 1fr;
  gap: 0px 0px;
  grid-template-areas: ". .";
  font-size: 1rem;
  font-weight: 600;
}

.tabItem {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-radius: 15px;
  margin: 0.2rem;
}

.tabItem:hover {
  cursor: pointer;
  background-color: white;
}
</style>
