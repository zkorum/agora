<template>
  <div class="container">
    <div ref="contentElement" class="content" :style="contentStyle">
      <slot />
    </div>
    <div v-if="shouldShowFade" class="fade-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from "vue";

const props = defineProps<{
  showFade: boolean;
  maxHeight?: string;
}>();

const contentElement = ref<HTMLElement | null>(null);
const isOverflowing = ref(false);

const contentStyle = computed(() => {
  if (props.maxHeight === undefined) {
    return undefined;
  }

  return {
    maxHeight: props.maxHeight,
    overflow: "hidden",
  };
});

const shouldShowFade = computed(
  () => props.showFade || isOverflowing.value,
);

let resizeObserver: ResizeObserver | undefined;

function updateOverflowState(): void {
  if (props.maxHeight === undefined || contentElement.value === null) {
    isOverflowing.value = false;
    return;
  }

  isOverflowing.value =
    contentElement.value.scrollHeight - contentElement.value.clientHeight > 1;
}

onMounted(async () => {
  await nextTick();
  updateOverflowState();

  if (typeof ResizeObserver === "undefined" || contentElement.value === null) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    updateOverflowState();
  });
  resizeObserver.observe(contentElement.value);
});

onUpdated(() => {
  updateOverflowState();
});

watch(
  () => props.maxHeight,
  () => {
    updateOverflowState();
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped lang="scss">
.container {
  position: relative;
}

.content {
  min-height: 0;
}

.fade-overlay {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 3rem;
  background: linear-gradient(transparent, white);
  pointer-events: none;
}
</style>
