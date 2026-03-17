<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: false,
    }"
  >
    <template #header>
      <div class="topBar">
        <MenuButton />

        <div class="tabScroller">
          <RouterLink to="/" class="tabLink">
            <ZKTab
              :text="t('home')"
              :is-highlighted="route.name === '/'"
              :should-underline-on-highlight="false"
            />
          </RouterLink>

          <RouterLink to="/topics/" class="tabLink">
            <ZKTab
              :text="t('explore')"
              :is-highlighted="route.name === '/topics/'"
              :should-underline-on-highlight="false"
            />
          </RouterLink>

          <div class="tabItem" @click="selectedTab('following')">
            <ZKTab
              :text="isLoggedIn ? t('following') : t('popular')"
              :is-highlighted="currentHomeFeedTab === 'following'"
              :should-underline-on-highlight="false"
            />
          </div>

          <div class="tabItem" @click="selectedTab('new')">
            <ZKTab
              :text="t('new')"
              :is-highlighted="currentHomeFeedTab === 'new'"
              :should-underline-on-highlight="false"
            />
          </div>
        </div>

        <LoginButton />
      </div>

      <WidthWrapper :enable="true">
        <FeaturedConversationBanner />
      </WidthWrapper>
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
import FeaturedConversationBanner from "src/components/feed/FeaturedConversationBanner.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import NewPostButtonWrapper from "src/components/post/NewPostButtonWrapper.vue";
import ZKTab from "src/components/ui-library/ZKTab.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useMenuBarActions } from "src/composables/ui/useMenuBarActions";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import type { HomeFeedSortOption } from "src/stores/homeFeed";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useRoute } from "vue-router";

import { type HomeTranslations, homeTranslations } from "./index.i18n";

const { t } = useComponentI18n<HomeTranslations>(homeTranslations);

const route = useRoute();

const { MenuButton, LoginButton } = useMenuBarActions();

const { currentHomeFeedTab } = storeToRefs(useHomeFeedStore());
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

function selectedTab(tab: HomeFeedSortOption) {
  window.scrollTo({ top: 0, behavior: "smooth" });
  currentHomeFeedTab.value = tab;
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.topBar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  width: 100%;
  overflow: hidden;
}

.tabScroller {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  white-space: nowrap;
  font-weight: var(--font-weight-semibold);
  font-size: 1rem;

  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
}

.tabLink {
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  border-radius: 15px;
}

.tabLink:hover {
  cursor: pointer;
}

.tabItem {
  flex-shrink: 0;
  padding: 0.3rem 0.6rem;
  border-radius: 15px;
}

.tabItem:hover {
  cursor: pointer;
}
</style>
