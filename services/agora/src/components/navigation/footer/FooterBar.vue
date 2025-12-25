<template>
  <div>
    <nav
      class="flexIcons container"
      aria-label="Footer navigation"
      role="navigation"
    >
      <RouterLink
        v-for="iconItem in visibleBottomIconList"
        :key="iconItem.name"
        :to="iconItem.route"
        class="iconStyle navigation-link"
        :aria-label="`Navigate to ${iconItem.name}`"
        :aria-current="route.name === iconItem.route ? 'page' : undefined"
        @click="handleNavigationClick($event, iconItem.route)"
      >
        <div class="iconDiv">
          <NewNotificationIndicator
            v-if="iconItem.route === '/notification/'"
          />
          <ZKStyledIcon
            class="icon-container"
            :class="{ 'icon-active': route.name === iconItem.route }"
            :svg-string="
              route.name === iconItem.route
                ? iconItem.filled
                : iconItem.standard
            "
          />
        </div>

        <ZKStyledText
          class="icon-label"
          :class="{ 'label-active': route.name === iconItem.route }"
          :text="iconItem.name"
          :add-gradient="route.name === iconItem.route"
        />
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import NewNotificationIndicator from "src/components/notification/NewNotificationIndicator.vue";
import ZKStyledIcon from "src/components/ui-library/ZKStyledIcon.vue";
import ZKStyledText from "src/components/ui-library/ZKStyledText.vue";
import { useAuthenticatedNavigation } from "src/composables/navigation/useAuthenticatedNavigation";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { navigationIcons } from "src/utils/ui/navigationIcons";
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import {
  type FooterBarTranslations,
  footerBarTranslations,
} from "./FooterBar.i18n";

const { isRouteVisible } = useAuthenticatedNavigation();

const { t } = useComponentI18n<FooterBarTranslations>(footerBarTranslations);

interface BottomIcon {
  name: string;
  standard: string;
  filled: string;
  route: keyof RouteNamedMap;
}

const bottomIconList: BottomIcon[] = [
  {
    name: t("home"),
    standard: navigationIcons.home.standard,
    filled: navigationIcons.home.filled,
    route: "/",
  },
  {
    name: t("explore"),
    standard: navigationIcons.explore.standard,
    filled: navigationIcons.explore.filled,
    route: "/topics/",
  },
  {
    name: t("dings"),
    standard: navigationIcons.notification.standard,
    filled: navigationIcons.notification.filled,
    route: "/notification/",
  },
];

const route = useRoute();

// Filter bottom icon list based on authentication state
const visibleBottomIconList = computed(() => {
  return bottomIconList.filter((icon) => isRouteVisible(icon.route));
});

function handleNavigationClick(
  event: Event,
  targetRoute: keyof RouteNamedMap
): void {
  // If clicking on the current route, scroll to top
  if (route.name === targetRoute) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
</script>

<style scoped lang="scss">
.flexIcons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.iconStyle {
  padding: 0.6rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  border: 2px solid transparent; // Reserve space to prevent pixel shifting
  border-radius: 12px;
  transition: all 0.2s ease-in-out;
  background: transparent;
  color: inherit;
}

.container {
  color: $color-text-weak;
  background-color: white;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.iconDiv {
  position: relative;
  width: 2rem;
  height: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.iconDiv :deep(svg) {
  width: 22px;
  height: 22px;
  max-width: 22px;
  max-height: 22px;
}

.icon-container {
  transition: transform 0.2s ease-in-out;

  .iconStyle:hover & {
    transform: scale(1.05);
  }
}

.icon-label {
  transition: color 0.2s ease-in-out;
  font-weight: var(--font-weight-bold);
}

.navigation-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

// Accessibility improvements for high contrast mode
@media (prefers-contrast: high) {
  .iconStyle {
    border-color: currentColor;

    &:focus {
      border-color: currentColor;
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
}

// Reduced motion preference
@media (prefers-reduced-motion: reduce) {
  .iconStyle,
  .icon-container,
  .icon-label {
    transition: none;
  }

  .iconStyle:hover {
    transform: none;
  }

  .iconStyle:hover .icon-container {
    transform: none;
  }
}
</style>
