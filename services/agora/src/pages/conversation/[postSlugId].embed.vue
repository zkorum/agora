<template>
  <EmbedLayout ref="embedLayoutRef">
    <div v-if="hasConversationData">
      <div class="container">
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
          :style="{ '--header-height': headerHeight + 'px' }"
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
    </div>
  </EmbedLayout>
</template>

<script setup lang="ts">
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import { useConversationParentState } from "src/composables/conversation/useConversationParentState";
import { useTabScrollRestoration } from "src/composables/conversation/useTabScrollRestoration";
import { useStickyObserver } from "src/composables/ui/useStickyObserver";
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, ref } from "vue";

const embedLayoutRef = ref<{ containerElement: HTMLElement | null } | null>(null);
const scrollContainer = computed(() => embedLayoutRef.value?.containerElement ?? null);

const { sentinelElement, headerHeight } = useStickyObserver();

const {
  route,
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
  scrollToActionBar,
  pendingScrollOverride,
} = useConversationParentState({
  analysisRouteName: "/conversation/[postSlugId].embed/analysis",
  commentRouteNames: [
    "/conversation/[postSlugId].embed/",
    "/conversation/[postSlugId].embed",
  ],
  routePrefix: "/conversation/{id}/embed",
  scrollContainer,
});

const { tabContentStyle } = useTabScrollRestoration({
  analysisRouteName: "/conversation/[postSlugId].embed/analysis",
  pendingScrollOverride,
  scrollToActionBar,
  scrollContainer,
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  flex-direction: column;
  padding: 1rem;
}
</style>
