<template>
  <div>
    <div class="container">
      <ShortcutButton
        v-for="item in items"
        :key="item"
        :is-selected="item === currentTab"
        :label="getLabel(item)"
        :to="getRoute?.(item)"
        @click="clickedShortcutButton(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

import ShortcutButton from "./ShortcutButton.vue";

const props = defineProps<{
  items: string[];
  getLabel: (item: string) => string;
  getRoute?: (item: string) => RouteLocationRaw;
  onSameTabClick?: () => void;
}>();

const currentTab = defineModel<string>({ required: true });

function clickedShortcutButton(shortcutName: string) {
  if (shortcutName === currentTab.value) {
    props.onSameTabClick?.();
  } else {
    currentTab.value = shortcutName;
  }
}
</script>

<style lang="postcss" scoped>
.container {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
