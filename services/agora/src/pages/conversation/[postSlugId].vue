<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <DefaultMenuBar :center-content="false">
        <template #left>
          <ZKIconButton icon="ci:chevron-left" aria-label="Go back" @click="handleBack" />
          <span v-if="isSticky && hasConversationData" class="navbar-title">
            {{ loadedConversationData.payload.title }}
          </span>
        </template>
      </DefaultMenuBar>
    </template>

    <q-pull-to-refresh @refresh="handleRefresh">
      <WidthWrapper :enable="true">
        <div v-if="hasConversationData">
          <ZKHoverEffect :enable-hover="false">
            <div class="container standardStyle">
              <PostContent
                :extended-post-data="loadedConversationData"
                :compact-mode="false"
                @open-moderation-history="openModerationHistory()"
                @verified="(payload) => handleTicketVerified(payload)"
              />

              <div ref="sentinelElement"></div>
              <div
                ref="actionBarElement"
                class="sticky-below-header sticky-action-bar"
                :style="{ '--header-height': (headerRevealed ? headerHeight : 0) + 'px' }"
              >
              <PostActionBar
                v-model="currentTab"
                :compact-mode="false"
                :opinion-count="
                  loadedConversationData.metadata.opinionCount + opinionCountOffset
                "
                :participant-count="participantCountLocal"
                :vote-count="loadedConversationData.metadata.voteCount"
                :total-participant-count="loadedConversationData.metadata.totalParticipantCount"
                :total-vote-count="loadedConversationData.metadata.totalVoteCount"
                :is-loading="isCurrentTabLoading"
                :conversation-slug-id="loadedConversationData.metadata.conversationSlugId"
                :conversation-title="loadedConversationData.payload.title"
                :author-username="loadedConversationData.metadata.authorUsername"
                :on-same-tab-click="() => scrollToActionBar({ behavior: 'smooth' })"
              />
              </div>

              <div v-if="currentTab === 'comment'" class="dropdownSlot">
                <CommentSortingSelector
                  :filter-value="commentFilter"
                  :moderated-opinion-count="loadedConversationData.metadata.moderatedOpinionCount"
                  :hidden-opinion-count="loadedConversationData.metadata.hiddenOpinionCount"
                  @changed-algorithm="
                    (filter: CommentFilterOptions) => { commentFilter = filter }
                  "
                />
              </div>

              <!-- Child routes: only tab-specific content -->
              <div class="tab-content" :style="tabContentStyle">
                <router-view v-slot="{ Component }">
                  <KeepAlive :max="2">
                    <component
                      :is="Component"
                      :key="route.path"
                      :conversation-data="loadedConversationData"
                      :has-conversation-data="hasConversationData"
                      :moderation-history-trigger="moderationHistoryTrigger"
                      :comment-filter="commentFilter"
                      :on-view-analysis="onViewAnalysis"
                      :navigate-to-discover-tab="navigateToDiscoverTab"
                      @update:comment-filter="
                        (filter: CommentFilterOptions) => { commentFilter = filter }
                      "
                    />
                  </KeepAlive>
                </router-view>
              </div>
            </div>
          </ZKHoverEffect>
        </div>
      </WidthWrapper>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import {
  type ConversationParentConfig,
  useConversationParentState,
} from "src/composables/conversation/useConversationParentState";
import { useTabScrollRestoration } from "src/composables/conversation/useTabScrollRestoration";
import { useStickyObserver } from "src/composables/ui/useStickyObserver";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { onBeforeUnmount, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const { sentinelElement, isSticky, headerHeight } = useStickyObserver();
const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();
const { safeNavigateBack } = useGoBackButtonHandler();

const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);
const { reveal: headerRevealed } = storeToRefs(useLayoutHeaderStore());

const conversationConfig: ConversationParentConfig = {
  analysisRouteName: "/conversation/[postSlugId]/analysis",
  commentRouteNames: [
    "/conversation/[postSlugId]/",
    "/conversation/[postSlugId]",
  ],
  routePrefix: "/conversation/{id}",
};

const {
  route,
  conversationQuery,
  conversationData,
  hasConversationData,
  loadedConversationData,
  opinionCountOffset,
  currentTab,
  isCurrentTabLoading,
  moderationHistoryTrigger,
  commentFilter,
  participantCountLocal,
  actionBarElement,
  onViewAnalysis,
  navigateToDiscoverTab,
  openModerationHistory,
  handleTicketVerified,
  handleRefresh,
  invalidateUserVotes,
  scrollToActionBar,
  pendingScrollOverride,
} = useConversationParentState(conversationConfig);

const { tabContentStyle } = useTabScrollRestoration({
  analysisRouteName: conversationConfig.analysisRouteName,
  pendingScrollOverride,
  scrollToActionBar,
});

function handleBack(): void {
  if (currentTab.value === "analysis") {
    const back = window.history.state?.back;
    const slugId = conversationData.value?.metadata.conversationSlugId;
    // If previous history entry is the comment tab of this conversation, pop it
    if (
      typeof back === "string" &&
      slugId !== undefined &&
      back.startsWith(`/conversation/${slugId}`) &&
      !back.includes("/analysis")
    ) {
      router.back();
    } else if (slugId !== undefined) {
      void router.replace({
        name: "/conversation/[postSlugId]/",
        params: { postSlugId: slugId },
      });
    }
  } else {
    void safeNavigateBack({ name: "/" });
  }
}

// Handle conversation creation navigation
onMounted(() => {
  if (navigationStore.cameFromConversationCreation) {
    resetDraft();
  }
});

// Watch for userId changes to detect account merges
watch(userId, async (newUserId, oldUserId) => {
  if (
    oldUserId !== undefined && newUserId !== undefined && oldUserId !== newUserId
  ) {
    if (conversationData.value) {
      void invalidateUserVotes(conversationData.value.metadata.conversationSlugId);
    }
    await conversationQuery.refetch();
  }
});

// Clear conversation creation context when leaving this page
onBeforeUnmount(() => {
  navigationStore.clearConversationCreationContext();
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.standardStyle {
  padding: 1rem;
}

.dropdownSlot {
  display: flex;
  justify-content: flex-end;
}

.navbar-title {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  min-width: 0;
  flex: 1;
  color: black;
  margin-right: 1rem;
}
</style>
