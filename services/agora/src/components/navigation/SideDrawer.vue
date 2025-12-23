<template>
  <div>
    <div class="container">
      <div>
        <div v-if="drawerBehavior == 'desktop'" class="logoDiv">
          <img src="/images/icons/agora-wings.svg" class="logoStyle1" />
          <img src="/images/icons/agora-text.svg" class="logoStyle2" />
        </div>

        <div v-if="isGuestOrLoggedIn" class="usernameBar">
          <UserAvatar
            :key="profileData.userName"
            :user-identity="profileData.userName"
            :size="35"
          />
          <DisplayUsername
            :username="profileData.userName"
            :show-is-guest="isGuest"
          />
        </div>

        <div class="menuListFlex">
          <RouterLink
            v-for="menuItem in navigationMenuItems"
            :key="menuItem.name"
            v-slot="{ navigate }"
            :to="menuItem.route"
            custom
          >
            <div
              class="navigation-link"
              @click="
                handleAuthenticatedRouteClick({
                  _event: $event,
                  requireAuth: menuItem.requireAuth,
                  navigate,
                })
              "
            >
              <ZKHoverEffect
                enable-hover
                hover-background-color="#f3f4f6"
                border-radius="15px"
              >
                <div
                  class="settingItemStyle"
                  :class="{
                    activeRoute: menuItem.matchRouteList.includes(route.name),
                  }"
                >
                  <div class="iconItem">
                    <ZKStyledIcon
                      :svg-string="
                        menuItem.matchRouteList.includes(route.name)
                          ? menuItem.svgStringFilled
                          : menuItem.svgStringStandard
                      "
                    />

                    <NewNotificationIndicator v-if="menuItem.name == 'Dings'" />
                  </div>

                  <div class="itemName">
                    {{ menuItem.name }}
                  </div>
                </div>
              </ZKHoverEffect>
            </div>
          </RouterLink>
        </div>
      </div>

      <div>
        <div
          v-if="drawerBehavior == 'desktop'"
          class="bottomSection StartConversationButtonLong"
        >
          <RouterLink :to="{ name: '/conversation/new/create/' }">
            <StartConversationButtonLong />
          </RouterLink>
        </div>
      </div>
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      active-intention="none"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import { navigationIcons } from "src/utils/ui/navigationIcons";
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import UserAvatar from "../account/UserAvatar.vue";
import PreLoginIntentionDialog from "../authentication/intention/PreLoginIntentionDialog.vue";
import DisplayUsername from "../features/user/DisplayUsername.vue";
import StartConversationButtonLong from "../newConversation/StartConversationButtonLong.vue";
import NewNotificationIndicator from "../notification/NewNotificationIndicator.vue";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import ZKStyledIcon from "../ui-library/ZKStyledIcon.vue";
import {
  type SideDrawerTranslations,
  sideDrawerTranslations,
} from "./SideDrawer.i18n";

const { isGuestOrLoggedIn, isGuest } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());
const { drawerBehavior, showMobileDrawer } = storeToRefs(useNavigationStore());

const route = useRoute();

const { t, locale } = useComponentI18n<SideDrawerTranslations>(
  sideDrawerTranslations
);

const showLoginDialog = ref(false);

interface NavigationMenuItem {
  name: string;
  route: keyof RouteNamedMap;
  matchRouteList: (keyof RouteNamedMap)[];
  requireAuth: boolean;
  svgStringStandard: string;
  svgStringFilled: string;
}

interface HandleAuthenticatedRouteClickParams {
  _event: Event;
  requireAuth: boolean;
  navigate: () => void;
}

const navigationMenuItems = ref<NavigationMenuItem[]>([]);
initializeMenu();

watch(drawerBehavior, () => {
  initializeMenu();
});

watch(locale, () => {
  initializeMenu();
});

function initializeMenu(): void {
  navigationMenuItems.value = []; // Clear existing items
  const menuItems: NavigationMenuItem[] = [];

  if (drawerBehavior.value === "desktop") {
    menuItems.push(
      {
        name: t("home"),
        route: "/",
        matchRouteList: ["/"],
        requireAuth: false,
        svgStringStandard: navigationIcons.home.standard,
        svgStringFilled: navigationIcons.home.filled,
      },
      {
        name: t("explore"),
        route: "/topics/",
        matchRouteList: ["/topics/"],
        requireAuth: false,
        svgStringStandard: navigationIcons.explore.standard,
        svgStringFilled: navigationIcons.explore.filled,
      },
      {
        name: t("dings"),
        route: "/notification/",
        matchRouteList: ["/notification/"],
        requireAuth: true,
        svgStringStandard: navigationIcons.notification.standard,
        svgStringFilled: navigationIcons.notification.filled,
      }
    );
  }

  const settingItemList: NavigationMenuItem[] = [
    {
      name: t("profile"),
      route: "/user-profile/conversations/",
      matchRouteList: ["/user-profile/conversations/"],
      requireAuth: true,
      svgStringStandard: navigationIcons.profile.standard,
      svgStringFilled: navigationIcons.profile.filled,
    },
    {
      name: t("settings"),
      route: "/settings/",
      matchRouteList: ["/settings/"],
      requireAuth: false,
      svgStringStandard: navigationIcons.settings.standard,
      svgStringFilled: navigationIcons.settings.filled,
    },
  ];

  navigationMenuItems.value = [...menuItems, ...settingItemList];
}

function handleAuthenticatedRouteClick({
  _event,
  requireAuth,
  navigate,
}: HandleAuthenticatedRouteClickParams): void {
  if (requireAuth && isGuestOrLoggedIn.value === false) {
    showLoginDialog.value = true;
  } else {
    if (drawerBehavior.value == "mobile") {
      showMobileDrawer.value = false;
    }
    navigate();
  }
}
</script>

<style lang="scss" scoped>
.container {
  height: 100dvh;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.settingItemStyle {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  font-size: 1rem;
  height: 3.5rem;
}

.usernameBar {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-weight: var(--font-weight-semibold);
  padding-top: 2rem;
  padding-bottom: 1.5rem;
  padding-left: 1rem;
}

.menuListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.logoDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.logoStyle1 {
  max-width: 2rem;
}

.logoStyle2 {
  max-width: 7rem;
}

.bottomSection {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.StartConversationButtonLong:hover {
  cursor: pointer;
}

.activeRoute {
  font-weight: var(--font-weight-bold);
  color: $primary;
}

.iconItem {
  position: relative;
  width: 2rem;
  display: flex;
  justify-content: center;
}

.itemName {
  padding-bottom: 0.4rem;
}

.navigation-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
