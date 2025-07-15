<template>
  <div>
    <div class="container">
      <ShortcutButton
        v-for="item in shortcutItemList"
        :key="item"
        :is-selected="item === currentTab"
        :label="item"
        @click="clickedShortcutButton(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ShortcutButton from "./ShortcutButton.vue";

const currentTab = defineModel<ShortcutItem>();

const shortcutItemList: ShortcutItem[] = [
  "Summary",
  "Me",
  "Common ground",
  "Majority",
  "Divisive",
  "Groups",
];

function clickedShortcutButton(shortcutName: ShortcutItem) {
  currentTab.value = shortcutName;
}
</script>

<style lang="postcss" scoped>
.container {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
