<template>
  <div class="pageContent">
    <Teleport v-if="isActive" to="#page-header">
      <HomeMenuBar>
        <template #center>
          <img
            v-if="drawerBehavior == 'mobile'"
            src="/images/icons/agora-wings.svg"
            class="agoraLogoStyle"
          />
        </template>
      </HomeMenuBar>

      <WidthWrapper :enable="true">
        <div class="tabCluster">
          <div class="tabItem" @click="selectedTab('following')">
            <ZKBadge
              :visible="hasPendingFollowingTab && currentHomeFeedTab !== 'following'"
            >
              <ZKTab
                :text="isLoggedIn ? t('following') : t('popular')"
                :is-highlighted="currentHomeFeedTab === 'following'"
                :should-underline-on-highlight="false"
              />
            </ZKBadge>
          </div>

          <!-- TODO: ACCESSIBILITY - Change <div> wrapper to semantic <button> or add proper ARIA attributes -->
          <!-- Tab navigation should be keyboard accessible for users with motor disabilities -->
          <div class="tabItem" @click="selectedTab('new')">
            <ZKBadge
              :visible="hasPendingNewTab && currentHomeFeedTab !== 'new'"
            >
              <ZKTab
                :text="t('new')"
                :is-highlighted="currentHomeFeedTab === 'new'"
                :should-underline-on-highlight="false"
              />
            </ZKBadge>
          </div>
        </div>
      </WidthWrapper>
    </Teleport>

    <div class="bannerWrapper">
      <WidthWrapper :enable="true">
        <FeaturedConversationBanner />
      </WidthWrapper>
    </div>

    <div class="container">
      <CompactPostList />
    </div>

    <NewPostButtonWrapper />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CompactPostList from "src/components/feed/CompactPostList.vue";
import FeaturedConversationBanner from "src/components/feed/FeaturedConversationBanner.vue";
import { HomeMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import NewPostButtonWrapper from "src/components/post/NewPostButtonWrapper.vue";
import ZKBadge from "src/components/ui-library/ZKBadge.vue";
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import type { HomeFeedSortOption } from "src/stores/homeFeed";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useNavigationStore } from "src/stores/navigation";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";

import { type HomeTranslations, homeTranslations } from "./index.i18n";

defineOptions({ name: "HomePage" });

const { isActive } = usePageLayout({});

const { t } = useComponentI18n<HomeTranslations>(homeTranslations);

const { drawerBehavior } = storeToRefs(useNavigationStore());

const { currentHomeFeedTab, hasPendingNewTab, hasPendingFollowingTab } =
  storeToRefs(useHomeFeedStore());
const { clearFeedDisplay } = useHomeFeedStore();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { invalidateFeedTab } = useInvalidateFeedQuery();

function selectedTab(tab: HomeFeedSortOption) {
  const hadPending = tab === "new" ? hasPendingNewTab.value : hasPendingFollowingTab.value;
  window.scrollTo({ top: 0, behavior: "smooth" });
  clearFeedDisplay();
  currentHomeFeedTab.value = tab;
  if (tab === "new") {
    hasPendingNewTab.value = false;
  } else {
    hasPendingFollowingTab.value = false;
  }
  if (hadPending) {
    invalidateFeedTab(tab);
  }
}
</script>

<style scoped lang="scss">
.pageContent {
  padding-top: 0.5rem;
}

.bannerWrapper {
  margin-bottom: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.agoraLogoStyle {
  width: 2rem;
  height: 1.75rem;
}

.tabCluster {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  font-weight: var(--font-weight-semibold);
  font-size: 1rem;
  padding-bottom: 0.25rem;
}

.tabItem {
  min-width: 8rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 15px;
}

.tabItem:hover {
  cursor: pointer;
}
</style>
