<template>
  <Teleport v-if="!hideBottomBarForRoute" to="body">
    <div class="bottomBar" :style="barStyle">
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useNavigationStore } from "src/stores/navigation";
import { computed } from "vue";
import { useRoute } from "vue-router";

const $q = useQuasar();
const route = useRoute();
const { drawerBehavior, drawerWidth } = storeToRefs(useNavigationStore());

const hideBottomBarForRoute = computed(() => {
  const routePath = route.path;
  const isConversationRoute = routePath.startsWith("/conversation/");
  const isConversationOnboardingRoute = routePath.includes("/onboarding");

  return !isConversationRoute || isConversationOnboardingRoute;
});

const barStyle = computed(() => {
  const isRtl = $q.lang.rtl;
  if (drawerBehavior.value === "desktop") {
    const dw = drawerWidth.value;
    // In RTL the drawer is on the right, so offset the center leftward
    const positionProp = isRtl ? "right" : "left";
    return {
      [positionProp]: `calc(50% + ${dw / 2}px)`,
      transform: isRtl ? "translateX(50%)" : "translateX(-50%)",
      width: `min(35rem, calc(100vw - ${dw}px - 1rem))`,
    };
  }
  return {
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(35rem, 100%)",
  };
});
</script>

<style scoped lang="scss">
.bottomBar {
  position: fixed;
  bottom: 0rem;
  z-index: 100;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 1.5rem;
  background: linear-gradient(to bottom, transparent 0%, $app-background-color 40%);
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}
</style>
