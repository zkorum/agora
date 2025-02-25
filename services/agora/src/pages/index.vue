<template>
  <DrawerLayout
    :general-props="{
      addBottomPadding: false,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasMenuButton: true,
      hasBackButton: false,
      hasCloseButton: false,
      hasLoginButton: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-menu-button="true"
        :has-back-button="false"
        :has-close-button="false"
        :has-login-button="true"
      >
        <template #left>
          <div class="menuButtonHover">
            <UserAvatar
              :size="40"
              :user-name="profileData.userName"
              @click="menuButtonClicked()"
            />
          </div>
        </template>
        <template #middle>
          <img :src="agoraLogo" class="agoraLogoStyle" />
        </template>
      </DefaultMenuBar>
    </template>

    <NewPostButtonWrapper @on-click="createNewPost()">
      <div class="container">
        <CompactPostList />
      </div>
    </NewPostButtonWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import CompactPostList from "src/components/feed/CompactPostList.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewPostButtonWrapper from "src/components/post/NewPostButtonWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import { useDialog } from "src/utils/ui/dialog";
import { useRouter } from "vue-router";

const agoraLogo = process.env.VITE_PUBLIC_DIR + "/images/icons/agora-logo.png";

const { profileData } = storeToRefs(useUserStore());

const { showDrawer } = storeToRefs(useNavigationStore());

const router = useRouter();
const dialog = useDialog();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

async function createNewPost() {
  if (isAuthenticated.value) {
    await router.push({ name: "/conversation/create/" });
  } else {
    dialog.showLoginConfirmationDialog();
  }
}

function menuButtonClicked() {
  showDrawer.value = !showDrawer.value;
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.agoraLogoStyle {
  width: 35px;
  height: 35px;
}

.menuButtonHover:hover {
  cursor: pointer;
}
</style>
