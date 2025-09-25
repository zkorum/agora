<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('userProfile')" :center-content="true" />
    </template>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <div class="topBar">
        <div class="usernameBar">
          <UserAvatar :user-identity="profileData.userName" :size="35" />

          <div class="userNameStyle">
            <!-- TODO: Map author verified status here -->
            <UserMetadata
              :author-verified="false"
              :user-identity="profileData.userName"
              :show-is-guest="isGuest"
              :show-verified-text="true"
              :user-type="'normal'"
            />
          </div>
        </div>

        <div class="profileMetadataBar">
          <div>
            {{ profileData.activePostCount }} {{ t("conversations") }}
            <span class="dotPadding">•</span>
          </div>
          <div>{{ getDateString(new Date(profileData.createdAt)) }}</div>
        </div>
      </div>

      <div class="tabCluster">
        <div v-for="tabItem in tabList" :key="tabItem.value">
          <ZKTab
            :text="tabItem.label"
            :is-highlighted="currentTab === tabItem.value"
            :should-underline-on-highlight="true"
            @click="selectedTab(tabItem.route)"
          />
        </div>
      </div>

      <router-view />
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { useUserStore } from "src/stores/user";
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getDateString } from "src/utils/common";
import { storeToRefs } from "pinia";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import type { RouteRecordName } from "vue-router";
import ZKTab from "src/components/ui-library/ZKTab.vue";
import UserMetadata from "src/components/features/user/UserMetadata.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  userProfileTranslations,
  type UserProfileTranslations,
} from "./user-profile.i18n";

const router = useRouter();

const { loadUserProfile } = useUserStore();
const { isGuest } = storeToRefs(useAuthenticationStore());

interface CustomTab {
  route: RouteRecordName;
  label: string;
  value: number;
}

const { t } = useComponentI18n<UserProfileTranslations>(
  userProfileTranslations
);

const tabList: CustomTab[] = [
  {
    route: "/user-profile/conversations/",
    label: t("conversationTab"),
    value: 0,
  },
  {
    route: "/user-profile/opinions/",
    label: t("opinionTab"),
    value: 1,
  },
];

const { profileData } = storeToRefs(useUserStore());
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

const currentTab = ref(0);

const route = useRoute();

applyCurrentTab();

onMounted(async () => {
  await initialize();
});

watch(isAuthInitialized, async () => {
  await initialize();
});

watch(route, () => {
  applyCurrentTab();
});

async function initialize() {
  if (isAuthInitialized.value) {
    await loadUserProfile();
  }
}

function pullDownTriggered(done: () => void) {
  setTimeout(() => {
    void loadUserProfile().then(() => {
      done();
    });
  }, 500);
}

function applyCurrentTab() {
  if (route.name == "/user-profile/conversations/") {
    currentTab.value = 0;
  } else {
    currentTab.value = 1;
  }
}

async function selectedTab(routeName: RouteRecordName) {
  if (routeName == "/user-profile/conversations/") {
    await router.replace({ name: "/user-profile/conversations/" });
  } else if (routeName == "/user-profile/opinions/") {
    await router.replace({ name: "/user-profile/opinions/" });
  } else {
    console.error("Unknown route: " + String(routeName));
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

.tabCluster {
  display: flex;
  gap: 1rem;
  padding-bottom: 1rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
