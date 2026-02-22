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
                :is-loading="isCurrentTabLoading"
                :conversation-slug-id="loadedConversationData.metadata.conversationSlugId"
                :conversation-title="loadedConversationData.payload.title"
                :author-username="loadedConversationData.metadata.authorUsername"
              />

              <!-- Child routes: only tab-specific content -->
              <router-view v-slot="{ Component }">
                <component
                  :is="Component"
                  :key="route.path"
                  :conversation-data="loadedConversationData"
                  :has-conversation-data="hasConversationData"
                  :moderation-history-trigger="moderationHistoryTrigger"
                />
              </router-view>
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
import PostContent from "src/components/post/display/PostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useInvalidateVoteQueries } from "src/utils/api/vote/useVoteQueries";
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();

const authStore = useAuthenticationStore();
const { userId, isAuthInitialized } = storeToRefs(authStore);

// Clear login intentions immediately (before query setup)
const loginIntentionStore = useLoginIntentionStore();
loginIntentionStore.clearVotingIntention();
loginIntentionStore.clearOpinionAgreementIntention();
loginIntentionStore.clearReportUserContentIntention();

// Use TanStack Query for conversation data
const conversationQuery = useConversationQuery({
  conversationSlugId: computed(() => (route.params as { postSlugId: string }).postSlugId),
  enabled: computed(() => isAuthInitialized.value),
});

const conversationData = computed(() => {
  const data = conversationQuery.data.value;
  if (!data || data.metadata.conversationSlugId === "") {
    return undefined;
  }
  return data;
});

const hasConversationData = computed(() => conversationData.value !== undefined);

// Type-safe version for template use (guaranteed non-undefined)
const loadedConversationData = computed(() => {
  const data = conversationData.value;
  if (!data) {
    // This should never happen inside v-if="hasConversationData" block
    throw new Error("[ConversationPage] Accessed conversation data before loaded");
  }
  return data;
});

const { invalidateUserVotes } = useInvalidateVoteQueries();
const { invalidateAnalysis: invalidateAnalysisQuery, invalidateAll, invalidateComments } = useInvalidateCommentQueries();

// Shared state for children
const opinionCountOffset = ref(0);
const participantCountOffset = ref(0);
const currentTab = ref<"comment" | "analysis">("comment");
const isCurrentTabLoading = ref(false);
const moderationHistoryTrigger = ref(0);

// Computed: base participant count + offset
const participantCountLocal = computed(
  () =>
    (conversationData.value?.metadata.participantCount ?? 0) +
    participantCountOffset.value
);

// Provide state and functions to child routes
provide("refreshConversation", async () => {
  await conversationQuery.refetch();
});
provide("opinionCountOffset", opinionCountOffset);
provide("participantCountOffset", participantCountOffset);
provide("setCurrentTabLoading", (loading: boolean) => {
  isCurrentTabLoading.value = loading;
});
provide("decrementOpinionCount", () => {
  opinionCountOffset.value -= 1;
});

// Navigation functions for banner actions
function navigateToAnalysis() {
  const data = conversationData.value;
  if (data === undefined) return;

  // Invalidate analysis cache to ensure fresh data when user navigates
  // This is important when user reaches threshold and clicks "View analysis"
  void invalidateAnalysisQuery(data.metadata.conversationSlugId);

  void router.push(
    `/conversation/${data.metadata.conversationSlugId}/analysis`
  );
}

function navigateToCommentTab() {
  const data = conversationData.value;
  if (data === undefined) return;

  // Invalidate comments cache to ensure fresh data when user navigates
  // This is important when user clicks "Vote more" from analysis page
  void invalidateComments(data.metadata.conversationSlugId);

  void router.push(
    `/conversation/${data.metadata.conversationSlugId}/`
  );
}

provide("navigateToAnalysis", navigateToAnalysis);
provide("navigateToCommentTab", navigateToCommentTab);

// Sync currentTab with route
watch(
  () => route.name,
  (newRouteName) => {
    if (newRouteName === "/conversation/[postSlugId]/analysis") {
      currentTab.value = "analysis";
    } else if (
      newRouteName === "/conversation/[postSlugId]/" ||
      newRouteName === "/conversation/[postSlugId]"
    ) {
      currentTab.value = "comment";
    }
  },
  { immediate: true }
);

function openModerationHistory(): void {
  // Navigate to comment tab if on analysis, then trigger moderation history
  if (currentTab.value !== "comment") {
    navigateToCommentTab();
  }
  moderationHistoryTrigger.value += 1;
}

const { loadAuthenticatedModules } = useBackendAuthApi();

async function handleTicketVerified(payload: {
  userIdChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
  if (payload.needsCacheRefresh) {
    await loadAuthenticatedModules();
  }

  // Refresh conversation data after ticket verification
  await conversationQuery.refetch();
}

async function handleRefresh(done: () => void): Promise<void> {
  if (!conversationData.value) {
    done();
    return;
  }

  const slugId = conversationData.value.metadata.conversationSlugId;

  // Invalidate all queries to force refresh (uses default refetchType: "active")
  // Active queries refetch immediately, inactive queries marked stale
  invalidateUserVotes(slugId);
  invalidateAll(slugId); // Invalidates comments + analysis

  // Refetch conversation metadata
  await conversationQuery.refetch();

  done();
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
      invalidateUserVotes(conversationData.value.metadata.conversationSlugId);
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
</style>
