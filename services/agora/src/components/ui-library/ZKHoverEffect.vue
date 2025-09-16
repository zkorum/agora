<template>
  <div
    :class="{
      desktopHoverEffect: enableHover,
      backgroundHoverEffect: enableHover && hoverBackgroundColor,
      baseBackgroundEffect: backgroundColor,
      borderRadiusEffect: borderRadius,
      touchInteractionEffect: enableHover,
    }"
    :style="optimizedTransitionStyles"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

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
  hoverBackgroundColor: "#e2e8f0", // $hover-background-color
  borderRadius: undefined,
});

// Touch interaction state
const isTouchPressed = ref<boolean>(false);

// Optimized computed property with proper TypeScript typing for Vue StyleValue
const optimizedTransitionStyles = computed(() => {
  // Only compute when enableHover changes - prevents unnecessary re-renders
  if (!props.enableHover) {
    return {};
  }

  return {
    transition: "background-color 0.2s ease", // $mouse-hover-transition
  };
});

// Touch interaction handlers for mobile devices
const handleTouchStart = (): void => {
  if (props.enableHover) {
    isTouchPressed.value = true;
  }
};

const handleTouchEnd = (): void => {
  if (props.enableHover) {
    isTouchPressed.value = false;
  }
};
</script>

<style scoped>
.baseBackgroundEffect {
  background-color: v-bind("props.backgroundColor");
}

.borderRadiusEffect {
  border-radius: v-bind("props.borderRadius");
}

/* Touch interaction optimization for mobile devices */
.touchInteractionEffect {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}

/* Touch active state for visual feedback */
.touchInteractionEffect:active {
  background-color: v-bind("props.hoverBackgroundColor");
  cursor: v-bind("props.cursor");
}

@media (hover: hover) and (pointer: fine) {
  .desktopHoverEffect:hover {
    cursor: v-bind("props.cursor");
  }

  .backgroundHoverEffect:hover {
    background-color: v-bind("props.hoverBackgroundColor");
  }
}

.desktopHoverEffect:focus,
.desktopHoverEffect:focus-visible {
  cursor: v-bind("props.cursor");
}

.backgroundHoverEffect:focus,
.backgroundHoverEffect:focus-visible {
  background-color: v-bind("props.hoverBackgroundColor");
}
</style>
