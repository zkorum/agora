<template>
  <div>
    <WidthWrapper :enable="true">
      <q-pull-to-refresh @refresh="pullDownTriggered">
        <q-infinite-scroll
          :offset="2000"
          :disable="!canLoadMore"
          @load="onLoad"
        >
          <PageLoadingSpinner v-if="showLoading" />

          <div
            v-if="isError && !showLoading"
            class="emptyDivPadding"
          >
            <div class="centerMessage">
              <div>
                <q-icon
                  :name="isOffline ? 'mdi-wifi-off' : 'mdi-alert-circle-outline'"
                  size="4rem"
                />
              </div>

              <div :style="{ fontSize: '1.3rem' }">
                {{ isOffline ? t("networkErrorTitle") : t("errorStateTitle") }}
              </div>

              <div v-if="isOffline">
                {{ t("networkErrorDescription") }}
              </div>

              <ActionButton
                v-if="!isOffline"
                variant="outline"
                @click="refetch()"
              >
                {{ t('retryButton') }}
              </ActionButton>
            </div>
          </div>

          <div
            v-else-if="partialHomeFeedList.length === 0 && !showLoading"
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

          <div v-else-if="partialHomeFeedList.length > 0">
            <div
              class="postListFlex"
              :class="{ 'loading-overlay': showLoading }"
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
      v-if="hasPendingCurrentTab && !showLoading"
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
import { isNetworkOffline } from "src/composables/useNetworkStatus";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useFeedQuery } from "src/utils/api/post/useFeedQuery";
import { computed, onActivated, onDeactivated, ref, watch } from "vue";

import WidthWrapper from "../navigation/WidthWrapper.vue";
import PostListItem from "../post/list/PostListItem.vue";
import PageLoadingSpinner from "../ui/PageLoadingSpinner.vue";
import ActionButton from "../ui-library/ActionButton.vue";
import ZKButton from "../ui-library/ZKButton.vue";
import {
  type CompactPostListTranslations,
  compactPostListTranslations,
} from "./CompactPostList.i18n";

const {
  partialHomeFeedList,
  hasPendingCurrentTab,
  canLoadMore,
} = storeToRefs(useHomeFeedStore());
const { hasNewPostCheck, loadMore, setFeedData, clearFeedData } = useHomeFeedStore();

const documentVisibility = useDocumentVisibility();

const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);

const { y: windowY } = useWindowScroll();

const { t } = useComponentI18n<CompactPostListTranslations>(
  compactPostListTranslations
);

// isPending: query has never resolved (waiting for auth init or first fetch).
// isFetching: any fetch is in flight (first load or refetch).
const { data, isPending, isError, refetch } = useFeedQuery({
  enabled: isAuthInitialized,
});

const isOffline = isNetworkOffline;

const showLoading = computed(() =>
  isPending.value && !isError.value
);

const isActive = ref(true);

watch(data, (newData) => {
  if (newData && isActive.value) {
    setFeedData(newData);
  }
});

onActivated(async () => {
  isActive.value = true;
  await hasNewPostCheck();
});

onDeactivated(() => {
  isActive.value = false;
});

watch(documentVisibility, async () => {
  if (isActive.value && documentVisibility.value === "visible") {
    await hasNewPostCheck();
  }
});

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (!isLoggedIn) {
      clearFeedData();
      void refetch();
    }
  }
);

watch(
  () => authStore.isGuestOrLoggedIn,
  (isGuestOrLoggedIn) => {
    if (!isGuestOrLoggedIn) {
      clearFeedData();
      void refetch();
    }
  }
);

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

</style>
