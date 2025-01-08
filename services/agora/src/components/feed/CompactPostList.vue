<template>
  <div>
    <div class="container">
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

      <q-pull-to-refresh @refresh="refreshPage">
        <div ref="postContainerRef">
          <div v-if="hasPendingNewPosts" class="floatingButton">
            <ZKButton
              icon="mdi-arrow-up"
              label="New"
              color="secondary"
              @click="refreshPage(() => {})"
            />
          </div>

          <div v-if="masterPostDataList.length > 0" class="postListFlex">
            <div
              v-for="postData in masterPostDataList"
              :key="postData.metadata.postSlugId"
            >
              <PostDetails
                :extended-post-data="postData"
                :compact-mode="true"
                :show-comment-section="false"
                :skeleton-mode="!dataReady"
                class="showCursor"
                :show-author="true"
                :display-absolute-time="false"
                @click="openPost(postData.metadata.postSlugId)"
              />

              <div class="seperator">
                <q-separator :inset="false" />
              </div>
            </div>
          </div>
        </div>
      </q-pull-to-refresh>

      <div ref="bottomOfPageDiv"></div>

      <div
        v-if="endOfFeed && masterPostDataList.length > 0"
        class="centerMessage"
      >
        <div>
          <q-icon name="mdi-check" size="4rem" />
        </div>

        <div :style="{ fontSize: '1.3rem' }">You're all caught up</div>

        <div>You have seen all the new conversations.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PostDetails from "../post/PostDetails.vue";
import { usePostStore } from "src/stores/post";
import ZKButton from "../ui-library/ZKButton.vue";
import { onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  useDocumentVisibility,
  useElementSize,
  useElementVisibility,
  useWindowScroll,
} from "@vueuse/core";
import { useRouter } from "vue-router";

const { masterPostDataList, dataReady, endOfFeed, lastSavedHomeFeedPosition } =
  storeToRefs(usePostStore());
const { loadPostData, hasNewPosts } = usePostStore();

const router = useRouter();

const bottomOfPageDiv = ref(null);
const targetIsVisible = useElementVisibility(bottomOfPageDiv);

const pageIsVisible = useDocumentVisibility();
const reachedEndOfPage = ref(false);

const hasPendingNewPosts = ref(false);

const windowScroll = useWindowScroll();
let isExpandingPosts = false;

const postContainerRef = ref(null);
const postContainerSize = useElementSize(postContainerRef);

watch(windowScroll.y, async () => {
  if (
    windowScroll.y.value > postContainerSize.height.value - 1000 &&
    !isExpandingPosts &&
    !endOfFeed.value
  ) {
    isExpandingPosts = true;
    await loadPostData(true);
    setTimeout(function () {
      isExpandingPosts = false;
    }, 500);
  }
});

watch(pageIsVisible, async () => {
  if (pageIsVisible.value && !endOfFeed.value) {
    await newPostCheck();
  }
});

watch(targetIsVisible, async () => {
  if (!reachedEndOfPage.value && !isExpandingPosts && !endOfFeed.value) {
    if (targetIsVisible.value) {
      isExpandingPosts = true;
      await loadPostData(true);
      isExpandingPosts = false;
    }
  }
});

onBeforeUnmount(() => {
  lastSavedHomeFeedPosition.value = -document.body.getBoundingClientRect().top;
});

async function newPostCheck() {
  if (
    hasPendingNewPosts.value == false &&
    dataReady.value &&
    pageIsVisible.value == "visible"
  ) {
    hasPendingNewPosts.value = await hasNewPosts();
  }
}

function openPost(postSlugId: string) {
  if (dataReady.value) {
    router.push({
      name: "/post/[postSlugId]",
      params: { postSlugId: postSlugId },
    });
  }
}

function refreshPage(done: () => void) {
  hasPendingNewPosts.value = false;

  window.scrollTo({
    top: 0,
    behavior: "instant",
  });

  loadPostData(false);

  setTimeout(() => {
    done();
  }, 1000);
}
</script>

<style scoped>
.postListFlex {
  display: flex;
  flex-direction: column;
}

a {
  text-decoration: none;
  color: unset;
}

.seperator {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
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

.container {
  padding-top: 0.5rem;
  padding-bottom: 20rem;
}

.centerMessage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 8rem;
  flex-direction: column;
}

.showCursor:hover {
  cursor: pointer;
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
</style>
