<template>
  <div
    :class="{
      desktopHoverEffect: enableHover,
      backgroundHoverEffect: enableHover && hoverBackgroundColor,
      baseBackgroundEffect: backgroundColor,
      borderRadiusEffect: borderRadius,
    }"
    :style="transitionStyles"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface ZKHoverEffectProps {
  enableHover: boolean;
  backgroundColor?: string;
  hoverBackgroundColor?: string;
  cursor?: "pointer" | "default";
  borderRadius?: string;
}

const props = withDefaults(defineProps<ZKHoverEffectProps>(), {
  cursor: "pointer",
  backgroundColor: undefined,
  hoverBackgroundColor: "#e2e8f0", // $mouse-hover-color
  borderRadius: undefined,
});

const transitionStyles = computed(() => {
  const styles: Record<string, string> = {};

  if (props.enableHover) {
    styles.transition = "background-color 0.2s ease"; // $mouse-hover-transition
  }

  return styles;
});
</script>

<style scoped>
.baseBackgroundEffect {
  background-color: v-bind("props.backgroundColor");
}

.borderRadiusEffect {
  border-radius: v-bind("props.borderRadius");
}

@media (hover: hover) and (pointer: fine) {
  .desktopHoverEffect:hover {
    cursor: v-bind("props.cursor");
  }

  .backgroundHoverEffect:hover {
    background-color: v-bind("props.hoverBackgroundColor");
  }
}
</style>
