<template>
  <MainLayout
    :general-props="{
      addBottomPadding: true,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasCloseButton: false,
      hasLoginButton: true,
      hasSettingsButton: true,
    }"
  >
    <NewPostButtonWrapper @on-click="createNewPost()">
      <div class="container">
        <CompactPostList />
      </div>
    </NewPostButtonWrapper>
  </MainLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CompactPostList from "src/components/feed/CompactPostList.vue";
import NewPostButtonWrapper from "src/components/post/NewPostButtonWrapper.vue";
import MainLayout from "src/layouts/MainLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { useRouter } from "vue-router";

const router = useRouter();
const dialog = useDialog();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

async function createNewPost() {
  if (isAuthenticated.value) {
    await router.push({ name: "/post/create/" });
  } else {
    dialog.showLoginConfirmationDialog();
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
