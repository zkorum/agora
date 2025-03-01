<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableFooter: true,
      enableHeader: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-menu-button="true"
        :has-back-button="false"
        :has-close-button="false"
        :has-login-button="true"
      >
        <template #middle>
          <img
            v-if="drawerBehavior == 'mobile'"
            :src="agoraLogo"
            class="agoraLogoStyle"
          />
        </template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <CompactPostList />
    </div>

    <NewPostButtonWrapper />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CompactPostList from "src/components/feed/CompactPostList.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import NewPostButtonWrapper from "src/components/post/NewPostButtonWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useNavigationStore } from "src/stores/navigation";

const agoraLogo = process.env.VITE_PUBLIC_DIR + "/images/icons/agora-logo.png";

const { drawerBehavior } = storeToRefs(useNavigationStore());
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
</style>
