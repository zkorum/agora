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
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
      </DefaultMenuBar>
    </template>

    <q-pull-to-refresh @refresh="refreshConversation">
      <WidthWrapper :enable="true">
        <PostDetails
          v-if="hasConversationData"
          :key="conversationData.metadata.lastReactedAt.toISOString()"
          v-model="currentTab"
          :conversation-data="conversationData"
          :compact-mode="false"
        />
      </WidthWrapper>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/useConversationData";
import { ref, onBeforeUnmount } from "vue";
import { useNavigationStore } from "src/stores/navigation";

const currentTab = ref<"comment" | "analysis">("comment");
const { conversationData, hasConversationData, refreshConversation } =
  useConversationData();
const navigationStore = useNavigationStore();

// Clear conversation creation context when leaving this page
onBeforeUnmount(() => {
  navigationStore.clearConversationCreationContext();
});
</script>

<style scoped lang="scss"></style>
