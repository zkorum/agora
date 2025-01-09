<template>
  <div>
    <div class="topBar">
      <UserAvatar :user-name="profileData.userName" :size="60" />

      <div class="userName">
        {{ profileData.userName }}
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
        <RouterLink :to="{ name: 'user-profile-posts' }">
          <Tab :value="0">Conversations</Tab>
        </RouterLink>
        <RouterLink :to="{ name: 'user-profile-comments' }">
          <Tab :value="1">Opinions</Tab>
        </RouterLink>
      </TabList>
      <router-view />
    </Tabs>
  </div>
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

const { profileData } = storeToRefs(useUserStore());

const currentTab = ref(0);

const route = useRoute();

applyCurrentTab();

watch(route, () => {
  applyCurrentTab();
});

function applyCurrentTab() {
  if (route.name == "user-profile-posts") {
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
  gap: 0.5rem;
  justify-content: space-between;
  padding: 0.5rem;
}

.tabPanelPadding {
  padding-top: 0.5rem;
}

.userName {
  font-size: 1.2rem;
}

.showCursor:hover {
  cursor: pointer;
}

.seperator {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
</style>
