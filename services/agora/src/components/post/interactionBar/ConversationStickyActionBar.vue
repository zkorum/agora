<template>
  <div
    ref="actionBarElement"
    :class="actionBarClasses"
    :style="{ '--header-height': `${stickyTop}px` }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  layout: "standard" | "project";
  stickyTop: number;
}>();

const emit = defineEmits<{
  "update:actionBarElement": [element: HTMLElement | null];
}>();

const actionBarElement = ref<HTMLElement | null>(null);
const actionBarClasses = computed(() =>
  props.layout === "standard"
    ? ["sticky-below-header", "sticky-action-bar"]
    : ["conversation-sticky-action-bar--project"]
);

watch(actionBarElement, (element) => emit("update:actionBarElement", element), {
  immediate: true,
});
</script>

<style scoped lang="scss">
.conversation-sticky-action-bar--project {
  position: sticky;
  top: var(--header-height, 0);
  z-index: 10;
  min-width: 0;
  margin-inline: -1rem;
  padding-inline: 1rem;
  padding-block-start: 1rem;
  padding-block-end: 0.65rem;
  background:
    radial-gradient(
      circle at 1px 1px,
      rgba($ink-darkest, 0.035) 1px,
      transparent 0
    ),
    $app-background-color;
  background-size: 24px 24px;
}
</style>
