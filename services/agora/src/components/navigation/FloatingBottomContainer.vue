<template>
  <div
    v-if="!hideBottomBarForRoute"
    v-show="isActive"
    ref="anchorPlaceholder"
    aria-hidden="true"
    :style="{ blockSize: `${barHeight}px` }"
  />
  <Teleport v-if="!hideBottomBarForRoute" to="body">
    <div
      v-show="isActive"
      ref="bottomBar"
      :inert="isOnboarding || undefined"
      :aria-hidden="isOnboarding || undefined"
      class="bottomBar"
      :style="{
        ...barStyle,
        ...viewportStyle,
      }"
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { useFloatingElementAlignment } from "src/composables/layout/useFloatingElementAlignment";
import { useVisibleViewport } from "src/utils/html/viewPort";
import {
  isConversationOnboardingRouteName,
  isConversationOnboardingRoutePath,
  isConversationRoutePath,
} from "src/utils/router/conversationRouteContext";
import { computed, onActivated, onDeactivated, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps<{
  anchorElement: HTMLElement | undefined;
}>();

const route = useRoute();
const router = useRouter();
const isOnboarding = computed(() =>
  isConversationOnboardingRouteName(router.currentRoute.value.name)
);
const anchorPlaceholder = useTemplateRef<HTMLElement>("anchorPlaceholder");
const bottomBar = useTemplateRef<HTMLElement>("bottomBar");
const isActive = ref(true);
const { viewportStyle } = useVisibleViewport();
const { height: barHeight } = useElementSize(bottomBar, undefined, {
  box: "border-box",
});
onActivated(() => {
  isActive.value = true;
});
onDeactivated(() => {
  isActive.value = false;
});

const hideBottomBarForRoute = computed(() => {
  const routePath = route.path;
  return (
    !isConversationRoutePath(routePath) ||
    isConversationOnboardingRoutePath(routePath)
  );
});

const barStyle = useFloatingElementAlignment({
  anchor: () => props.anchorElement ?? anchorPlaceholder.value,
  enabled: () => isActive.value && !hideBottomBarForRoute.value,
});
</script>

<style scoped lang="scss">
.bottomBar {
  --floating-bottom-clearance: calc(0.5rem + env(safe-area-inset-bottom));

  box-sizing: border-box;
  position: fixed;
  inset-block-end: var(--visible-viewport-bottom-inset, 0px);
  z-index: 100;
  padding-block-end: var(--floating-bottom-clearance);
  padding-block-start: 1.5rem;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    $app-background-color 40%
  );
  pointer-events: none;
  display: flex;
  flex-direction: column;
  max-block-size: var(--visible-viewport-height, 100dvh);

  > * {
    min-block-size: 0;
    pointer-events: auto;
  }
}
</style>
