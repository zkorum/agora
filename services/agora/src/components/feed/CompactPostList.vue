<template>
  <div ref="postContainerRef">
    <q-pull-to-refresh @refresh="pullDownTriggered">
      <q-infinite-scroll :offset="2000" :disable="!canLoadMore" @load="onLoad">
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
      </q-infinite-scroll>
    </q-pull-to-refresh>

    <q-page-sticky
      v-if="hasPendingNewPosts"
      position="bottom"
      :offset="[0, 30]"
      @click="refreshPage(() => {})"
    >
      <q-btn
        fab
        label="Refresh"
        icon="mdi-arrow-up"
        color="accent"
        unelevated
      />
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import PostDetails from "../post/PostDetails.vue";
import { usePostStore } from "src/stores/post";
import { onMounted, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDocumentVisibility } from "@vueuse/core";
import { useRouter } from "vue-router";

const {
  masterPostDataList,
  emptyPostDataList,
  dataReady,
  endOfFeed,
  hasPendingNewPosts,
} = storeToRefs(usePostStore());
const { loadPostData, hasNewPosts } = usePostStore();

const router = useRouter();

const pageIsVisible = useDocumentVisibility();

const postContainerRef = useTemplateRef<HTMLElement>("postContainerRef");

const canLoadMore = ref(true);

onMounted(async () => {
  await newPostCheck();
});

watch(pageIsVisible, async () => {
  if (pageIsVisible.value == "visible") {
    await newPostCheck();
  }
});

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    canLoadMore.value = await loadPostData(true);
  }
  done();
}

async function pullDownTriggered(done: () => void) {
  setTimeout(async () => {
    await loadPostData(false);
    hasPendingNewPosts.value = false;
    canLoadMore.value = true;
    done();
  }, 500);
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

  canLoadMore.value = await loadPostData(false);

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

.widthConstraint {
  position: relative;
  width: min(100%, 35rem);
  margin: auto;
}
</style>
