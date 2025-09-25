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
        />
      </WidthWrapper>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/conversation/useConversationData";
import { ref, onBeforeUnmount } from "vue";
import { useNavigationStore } from "src/stores/navigation";

const postDetailsRef = ref<InstanceType<typeof PostDetails>>();
const { conversationData, hasConversationData, refreshConversation } =
  useConversationData();
const navigationStore = useNavigationStore();

function handleRefresh(done: () => void): void {
  refreshConversation(() => {
    // After conversation data is refreshed, also refresh all tab data
    if (postDetailsRef.value) {
      postDetailsRef.value.refreshAllData();
    }
    done();
  });
}

// Clear conversation creation context when leaving this page
onBeforeUnmount(() => {
  navigationStore.clearConversationCreationContext();
});
</script>

<style scoped lang="scss"></style>
