<template>
  <RouterLink
    v-if="item.type === 'navigation'"
    :to="item.to"
    class="settings-item settings-item--link"
  >
    <SettingsMenuItem
      :label="item.label"
      :value="item.value"
      :style="item.style"
      :show-separator="showSeparator"
      :border-radius="borderRadius"
    />
  </RouterLink>
  <button
    v-else
    type="button"
    class="settings-item settings-item--button"
    @click="handleItemClick"
  >
    <SettingsMenuItem
      :label="item.label"
      :value="item.value"
      :style="item.style"
      :show-separator="showSeparator"
      :border-radius="borderRadius"
    />
  </button>
</template>

<script setup lang="ts">
import type { SettingsInterface } from "src/utils/component/settings/settings";
import SettingsMenuItem from "./SettingsMenuItem.vue";

const props = defineProps<{
  item: SettingsInterface;
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();

function handleItemClick(): void {
  if (props.item.type === "action") {
    props.item.action();
  }
}
</script>

<style scoped lang="scss">
.settings-item {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  font: inherit;

  // Ensure focus indicators are visible for keyboard navigation
  &:focus-visible {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
    border-radius: 20px;
  }
}
</style>
