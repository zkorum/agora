<template>
  <Teleport v-if="isActive" to="#page-header">
    <DefaultMenuBar :center-content="false">
      <template #left>
        <BackButton @click="handleBack" />
        <span v-if="isSticky && hasConversationData" class="navbar-title">
          {{ loadedConversationData.payload.title }}
        </span>
      </template>
    </DefaultMenuBar>
  </Teleport>

  <q-pull-to-refresh @refresh="handleRefresh">
      <WidthWrapper :enable="true">
        <PageLoadingSpinner v-if="conversationQuery.isPending.value && !hasConversationData" />

        <ErrorRetryBlock
          v-else-if="conversationQuery.isError.value && !conversationQuery.isPending.value && !hasConversationData"
          :title="t('errorTitle')"
          :retry-label="t('retryButton')"
          @retry="conversationQuery.refetch()"
        />

        <div v-else-if="hasConversationData">
          <ZKHoverEffect :enable-hover="false">
            <div class="container standardStyle">
              <PostContent
                :extended-post-data="loadedConversationData"
                :compact-mode="false"
                @open-moderation-history="openModerationHistory()"
                @conversation-deleted="handleConversationDeleted"
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
                :conversation-type="loadedConversationData.metadata.conversationType"
                :has-survey="loadedConversationData.interaction.surveyGate?.hasSurvey === true"
              />
              </div>

              <div v-if="currentTab === 'comment' && loadedConversationData.metadata.conversationType !== 'maxdiff'" class="dropdownSlot">
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

              <FloatingBottomContainer
                v-if="loadedConversationData.metadata.conversationType !== 'maxdiff'"
              >
                <CommentComposer
                  ref="commentComposerRef"
                  :post-slug-id="loadedConversationData.metadata.conversationSlugId"
                  :participation-mode="loadedConversationData.metadata.participationMode"
                  :requires-event-ticket="loadedConversationData.metadata.requiresEventTicket"
                  :survey-gate="loadedConversationData.interaction.surveyGate"
                  :is-composer-disabled="isVotingDisabled"
                  @submitted-comment="handleSubmittedComment"
                />
              </FloatingBottomContainer>
            </div>
          </ZKHoverEffect>
        </div>
      </WidthWrapper>
    </q-pull-to-refresh>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import FloatingBottomContainer from "src/components/navigation/FloatingBottomContainer.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import CommentComposer from "src/components/post/comments/CommentComposer.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import {
  type ConversationParentConfig,
  useConversationParentState,
} from "src/composables/conversation/useConversationParentState";
import { useTabScrollRestoration } from "src/composables/conversation/useTabScrollRestoration";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useStickyObserver } from "src/composables/ui/useStickyObserver";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import {
  isBackToConversationCommentTab,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationPageTranslations,
  conversationPageTranslations,
} from "./[postSlugId].i18n";

const { isActive } = usePageLayout({ enableFooter: false });

const router = useRouter();
const { t } = useComponentI18n<ConversationPageTranslations>(
  conversationPageTranslations
);
const { sentinelElement, isSticky, headerHeight, refresh: refreshStickyState } = useStickyObserver();
const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();
const { safeNavigateBack } = useGoBackButtonHandler();

const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);
const { reveal: headerRevealed } = storeToRefs(useLayoutHeaderStore());
const commentComposerRef = ref<InstanceType<typeof CommentComposer>>();

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
  handleSubmittedComment,
  handleRefresh,
  invalidateUserVotes,
  scrollToActionBar,
  pendingScrollOverride,
} = useConversationParentState(conversationConfig);

const isVotingDisabled = computed(() => {
  const data = conversationData.value;
  if (data === undefined) {
    return true;
  }

  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";
  return isModeratedAndLocked || data.metadata.isClosed;
});

const { tabContentStyle } = useTabScrollRestoration({
  analysisRouteName: conversationConfig.analysisRouteName,
  pendingScrollOverride,
  actionBarElement,
  onScrollComplete: refreshStickyState,
});

function handleBack(event: MouseEvent): void {
  event.preventDefault();
  if (currentTab.value === "analysis") {
    const slugId = conversationData.value?.metadata.conversationSlugId;
    if (slugId === undefined) return;

    const fallbackRoute = `/conversation/${slugId}/`;
    const conversationPathPrefix = conversationConfig.routePrefix.replace("{id}", slugId);
    void navigateBackOrReplace({
      router,
      fallbackRoute,
      shouldNavigateBack: isBackToConversationCommentTab({
        historyBack: window.history.state?.back,
        conversationPathPrefix,
      }),
    });
  } else {
    void safeNavigateBack({ name: "/" });
  }
}

function handleConversationDeleted(): void {
  commentComposerRef.value?.discardDraft();
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
  gap: 0.5rem;
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
