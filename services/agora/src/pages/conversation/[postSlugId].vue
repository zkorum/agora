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
      <StandardMenuBar :title="''" :center-content="false" />
    </template>

    <q-pull-to-refresh @refresh="handleRefresh">
      <WidthWrapper :enable="true">
        <PostDetails
          v-if="hasConversationData"
          ref="postDetailsRef"
          :conversation-data="conversationData"
          :compact-mode="false"
          @ticket-verified="handleTicketVerifiedInPage"
        />
      </WidthWrapper>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/conversation/useConversationData";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useInvalidateVoteQueries } from "src/utils/api/vote/useVoteQueries";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const postDetailsRef = ref<InstanceType<typeof PostDetails>>();
const { conversationData, hasConversationData, refreshConversation } =
  useConversationData();
const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();

const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);

const { invalidateUserVotes } = useInvalidateVoteQueries();

function handleRefresh(done: () => void): void {
  refreshConversation(() => {
    // After conversation data is refreshed, also refresh all tab data
    if (postDetailsRef.value) {
      postDetailsRef.value.refreshAllData();
    }
    done();
  });
}

function reloadConversationWithUserInteractions(): void {
  console.log('[ConversationPage] Reloading conversation with user interactions');
  // Reload conversation data to fetch user interactions (poll responses, votes, comments)
  refreshConversation(() => {
    console.log('[ConversationPage] Conversation refreshed, now refreshing all tab data');
    // After conversation data is refreshed, also refresh comments/votes
    if (postDetailsRef.value) {
      postDetailsRef.value.refreshAllData();
    }
  });
}

function handleTicketVerifiedInPage(payload: {
  userIdChanged: boolean;
  needsCacheRefresh: boolean;
}): void {
  // Only refresh if userId didn't change (otherwise userId watcher will handle it)
  if (!payload.userIdChanged) {
    console.log('[ConversationPage] Ticket verified, userId unchanged - refreshing data');
    // When userId doesn't change (currentUserId === newUserId), the user just verified a ticket
    // We need to manually refresh conversation data and all tab data to show updated state
    // (conversation no longer locked, user can now participate)
    reloadConversationWithUserInteractions();
  } else {
    console.log('[ConversationPage] Ticket verified, userId changed - letting watcher handle refresh');
    // When userId changes, the userId watcher will detect it and call reloadConversationWithUserInteractions()
    // We don't need to do anything here to avoid duplicate refreshes
  }
}

// Clear draft only after successfully navigating from conversation creation
onMounted(() => {
  if (navigationStore.cameFromConversationCreation) {
    resetDraft();
  }
});

// Watch for userId changes to detect account merges:
// - userId1 -> userId2: Account merge (guest->verified, guest->guest)
// Note: We do NOT reload on undefined -> userId (new guest creation via opinion/vote/Zupass)
// because those are handled by their respective component handlers (submittedComment, ticket verification, etc.)
// Reloading here would race with those handlers and cause the UI to not update properly
watch(userId, (newUserId, oldUserId) => {
  // Only reload if userId changed from one defined value to another (account merge)
  // Do NOT reload on undefined -> userId to avoid race conditions with opinion/vote/Zupass handlers
  if (
    oldUserId !== undefined && newUserId !== undefined && oldUserId !== newUserId
  ) {
    console.log('[ConversationPage] Account merge detected (userId changed) - reloading data');
    // Invalidate vote queries to force refetch (they have 5-minute cache)
    if (conversationData.value) {
      invalidateUserVotes(conversationData.value.metadata.conversationSlugId);
    }
    reloadConversationWithUserInteractions();
  }
});

// Clear conversation creation context when leaving this page
onBeforeUnmount(() => {
  navigationStore.clearConversationCreationContext();
});
</script>

<style scoped lang="scss"></style>
