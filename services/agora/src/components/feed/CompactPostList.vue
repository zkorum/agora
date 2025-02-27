<template>
  <div>
    <div ref="postContainerRef" class="containerBase">
      <div
        v-if="masterPostDataList.length == 0 && dataReady"
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

      <div class="widthConstraint">
        <div v-if="hasPendingNewPosts" class="floatingButton">
          <ZKButton
            icon="mdi-arrow-up"
            label="New"
            color="primary"
            @click="refreshPage(() => {})"
          />
        </div>

        <div v-if="!dataReady" class="postListFlex">
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
          v-if="dataReady && masterPostDataList.length > 0"
          class="postListFlex"
        >
          <div
            v-for="postData in masterPostDataList"
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
        v-if="dataReady && endOfFeed && masterPostDataList.length > 0"
        class="centerMessage"
      >
        <div>
          <q-icon name="mdi-check" size="4rem" />
        </div>

        <div :style="{ fontSize: '1.3rem' }">You're all caught up</div>

        <div>You have seen all the new conversations.</div>
      </div>

      <q-inner-loading :showing="loadingVisible">
        <q-spinner-gears size="50px" color="primary" />
      </q-inner-loading>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostDetails from "../post/PostDetails.vue";
import { usePostStore } from "src/stores/post";
import ZKButton from "../ui-library/ZKButton.vue";
import { onMounted, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDocumentVisibility, useInfiniteScroll } from "@vueuse/core";
import { useRouter } from "vue-router";
import { usePullDownToRefresh } from "src/utils/ui/pullDownToRefresh";

const postContainerRef = useTemplateRef<HTMLElement>("postContainerRef");

const { loadingVisible } = usePullDownToRefresh(
  pullDownTriggered,
  postContainerRef
);

const { masterPostDataList, emptyPostDataList, dataReady, endOfFeed } =
  storeToRefs(usePostStore());
const { loadPostData, hasNewPosts } = usePostStore();

const router = useRouter();

const pageIsVisible = useDocumentVisibility();

const hasPendingNewPosts = ref(false);

let canLoadMore = true;

useInfiniteScroll(
  postContainerRef,
  async () => {
    canLoadMore = await loadPostData(true);
  },
  {
    distance: 1000,
    canLoadMore: () => {
      return canLoadMore;
    },
  }
);

onMounted(async () => {
  await newPostCheck();
});

watch(pageIsVisible, async () => {
  if (pageIsVisible.value == "visible") {
    await newPostCheck();
  }
});

async function pullDownTriggered() {
  await loadPostData(false);
  hasPendingNewPosts.value = false;
}

async function newPostCheck() {
  if (
    hasPendingNewPosts.value == false &&
    dataReady.value &&
    pageIsVisible.value == "visible"
  ) {
    hasPendingNewPosts.value = await hasNewPosts();
  }
}

async function openPost(postSlugId: string) {
  if (dataReady.value) {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: postSlugId },
    });
  }
}

async function refreshPage(done: () => void) {
  if (postContainerRef.value) {
    postContainerRef.value.scrollTop = 0;
  }

  canLoadMore = await loadPostData(false);

  setTimeout(() => {
    done();
  }, 500);

  hasPendingNewPosts.value = false;
}
</script>

<style scoped>
.postListFlex {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.emptyDivPadding {
  padding-top: 5rem;
}

.fetchErrorMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 4rem;
  font-size: 1.2rem;
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

.floatingButton {
  position: fixed;
  bottom: 5rem;
  z-index: 100;
  display: flex;
  justify-content: center;
  margin: auto;
  left: calc(50% - 3rem);
}

.widthConstraint {
  max-width: 35rem;
  margin: auto;
}

.containerBase {
  position: relative;
  margin: auto;
  height: calc(100dvh - 7rem);
  overflow-y: scroll;
  overscroll-behavior: none;
}
</style>
