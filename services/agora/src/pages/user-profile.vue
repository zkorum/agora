<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar :title="t('userProfile')" :center-content="true" />
    </Teleport>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <PageLoadingSpinner v-if="isLoading" />

      <ErrorRetryBlock
        v-else-if="isError"
        :title="t('errorTitle')"
        :retry-label="t('retryButton')"
        @retry="initialize()"
      />

      <div v-else class="topBar">
        <div class="usernameBar">
          <UserAvatar :user-identity="profileData.userName" :size="35" />

          <div class="userNameStyle">
            <!-- TODO: Map author verified status here -->
            <UserMetadata
              :author-verified="false"
              :user-identity="profileData.userName"
              :show-is-guest="isGuest"
              :show-verified-text="true"
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

      <div v-if="!isLoading && !isError" class="tabCluster">
        <div v-for="tabItem in tabList" :key="tabItem.value">
          <ZKTab
            :text="tabItem.label"
            :is-highlighted="currentTab === tabItem.value"
            :should-underline-on-highlight="true"
            :to="{ name: tabItem.route }"
            :replace="true"
          />
        </div>
      </div>

      <router-view v-if="!isLoading && !isError" v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </q-pull-to-refresh>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import UserMetadata from "src/components/features/user/UserMetadata.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { getDateString } from "src/utils/common";
import { onActivated, ref, watch } from "vue";
import { useRoute } from "vue-router";

import {
  type UserProfileTranslations,
  userProfileTranslations,
} from "./user-profile.i18n";

defineOptions({ name: "UserProfilePage" });

const { isActive } = usePageLayout({ enableFooter: false, reducedWidth: true, addBottomPadding: true });

const { loadUserProfile } = useUserStore();
const authStore = useAuthenticationStore();
const { isGuest, isAuthInitialized } = storeToRefs(authStore);

interface CustomTab {
  route: "/user-profile/conversations/" | "/user-profile/opinions/";
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

const currentTab = ref(0);
const isLoading = ref(true);
const isError = ref(false);
const hasLoadedOnce = ref(false);

const route = useRoute();

applyCurrentTab();

onActivated(() => {
  if (!hasLoadedOnce.value && isAuthInitialized.value) {
    void initialize();
  } else if (hasLoadedOnce.value) {
    void loadUserProfile();
  }
});

watch(isAuthInitialized, (initialized) => {
  if (initialized && !hasLoadedOnce.value) {
    void initialize();
  }
});

// Reset cached state on logout so stale data isn't shown after re-login
watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (!isLoggedIn) {
      hasLoadedOnce.value = false;
      isLoading.value = true;
    }
  }
);

watch(route, () => {
  applyCurrentTab();
});

async function initialize() {
  if (isAuthInitialized.value) {
    isLoading.value = true;
    isError.value = false;
    await loadUserProfile();
    isLoading.value = false;
    if (profileData.value.dataLoaded) {
      hasLoadedOnce.value = true;
    } else {
      isError.value = true;
    }
  }
}

function pullDownTriggered(done: () => void) {
  setTimeout(() => {
    void initialize().then(() => {
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
