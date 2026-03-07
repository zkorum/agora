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
      <StandardMenuBar title="" :center-content="false" />
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
              >
                <template #dropdown>
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
                </template>
              </PostActionBar>

              <!-- Child routes: only tab-specific content -->
              <div class="tab-content">
                <router-view v-slot="{ Component }">
                  <component
                    :is="Component"
                    :key="route.path"
                    :conversation-data="loadedConversationData"
                    :has-conversation-data="hasConversationData"
                    :moderation-history-trigger="moderationHistoryTrigger"
                    :comment-filter="commentFilter"
                    @update:comment-filter="
                      (filter: CommentFilterOptions) => { commentFilter = filter }
                    "
                  />
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
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import { useConversationParentState } from "src/composables/conversation/useConversationParentState";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { onBeforeUnmount, onMounted, watch } from "vue";

const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();

const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);

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
  openModerationHistory,
  handleTicketVerified,
  handleRefresh,
  invalidateUserVotes,
} = useConversationParentState({
  analysisRouteName: "/conversation/[postSlugId]/analysis",
  commentRouteNames: [
    "/conversation/[postSlugId]/",
    "/conversation/[postSlugId]",
  ],
  routePrefix: "/conversation/{id}",
});

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
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1rem;
}

.dropdownSlot {
  display: flex;
  justify-content: flex-end;
}

.tab-content {
  min-height: 100vh;
}
</style>
