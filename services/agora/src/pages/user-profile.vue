<template>
  <MainLayout
    :general-props="{
      addBottomPadding: true,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasSettingsButton: true,
      hasCloseButton: false,
      hasLoginButton: true,
    }"
  >
    <div class="topBar">
      <div class="usernameBar">
        <UserAvatar :user-name="profileData.userName" :size="40" />

        <div class="userNameStyle">
          <!-- TODO: Map author verified status here -->
          <Username
            :author-verified="false"
            :user-name="profileData.userName"
          />
        </div>
      </div>

      <div class="profileMetadataBar">
        <div>
          {{ profileData.activePostCount }} conversations
          <span class="dotPadding">•</span>
        </div>
        <div>{{ getDateString(new Date(profileData.createdAt)) }}</div>
      </div>
    </div>

    <Tabs :value="currentTab">
      <TabList>
        <RouterLink :to="{ name: '/user-profile/conversations/' }">
          <Tab :value="0">Conversations</Tab>
        </RouterLink>
        <RouterLink :to="{ name: '/user-profile/opinions/' }">
          <Tab :value="1">Opinions</Tab>
        </RouterLink>
      </TabList>
      <router-view />
    </Tabs>
  </MainLayout>
</template>

<script setup lang="ts">
import Tabs from "primevue/tabs";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { useUserStore } from "src/stores/user";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getDateString } from "src/utils/common";
import { storeToRefs } from "pinia";
import MainLayout from "src/layouts/MainLayout.vue";
import Username from "src/components/post/views/Username.vue";

const { profileData } = storeToRefs(useUserStore());

const currentTab = ref(0);

const route = useRoute();

applyCurrentTab();

watch(route, () => {
  applyCurrentTab();
});

function applyCurrentTab() {
  if (route.name == "/user-profile/conversations/") {
    currentTab.value = 0;
  } else {
    currentTab.value = 1;
  }
}
</script>

<style scoped lang="scss">
.profileMetadataBar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  color: $color-text-strong;
  font-size: 0.9rem;
}

.dotPadding {
  padding-left: 0.2rem;
  padding-right: 0.2rem;
}

.topBar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.tabPanelPadding {
  padding-top: 0.5rem;
}

.userNameStyle {
  font-size: 1.1rem;
}

.showCursor:hover {
  cursor: pointer;
}

.seperator {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.usernameBar {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  align-items: center;
}
</style>
