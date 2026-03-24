<template>
  <Teleport to="body">
    <div class="bottomBar" :style="barStyle">
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";
import { computed } from "vue";

const { drawerBehavior, drawerWidth } = storeToRefs(useNavigationStore());

const barStyle = computed(() => {
  if (drawerBehavior.value === "desktop") {
    const dw = drawerWidth.value;
    return {
      left: `calc(50% + ${dw / 2}px)`,
      width: `min(35rem, calc(100vw - ${dw}px - 1rem))`,
    };
  }
  return {
    left: "50%",
    width: "min(35rem, 100%)",
  };
});
</script>

<style scoped lang="scss">
.bottomBar {
  position: fixed;
  bottom: 0rem;
  transform: translateX(-50%);
  z-index: 100;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 1.5rem;
  background: linear-gradient(to bottom, transparent 0%, #f6f5f8 40%);
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}
</style>
