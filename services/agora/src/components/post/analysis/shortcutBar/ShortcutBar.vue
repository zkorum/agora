<template>
  <div>
    <div class="container">
      <ShortcutButton
        v-for="item in items"
        :key="item"
        :is-selected="item === currentTab"
        :label="getLabel(item)"
        @click="clickedShortcutButton(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ShortcutButton from "./ShortcutButton.vue";

const props = defineProps<{
  items: string[];
  getLabel: (item: string) => string;
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
