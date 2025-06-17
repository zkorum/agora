<template>
  <div>
    <div class="container">
      <ShortcutButton
        v-for="item in shortcutItemList"
        :key="item"
        :is-selected="true"
        :label="item"
        @click="clickedShortcutButton(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import ShortcutButton from "./ShortcutButton.vue";

const emit = defineEmits(["clicked-shortcut"]);

const shortcutItemList: ShortcutItem[] = [
  "Me",
  "Consensus",
  "Divisiveness",
  "Uncertain",
  "Opinion Groups",
];

function clickedShortcutButton(shortcutName: ShortcutItem) {
  emit("clicked-shortcut", shortcutName);
}
</script>

<style lang="postcss" scoped>
.container {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
