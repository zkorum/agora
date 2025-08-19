<template>
  <RouterLink :to="to" class="settings-navigation-item">
    <SettingsMenuItem
      :label="label"
      :value="value"
      :style="style"
      :show-separator="showSeparator"
      :border-radius="borderRadius"
    />
  </RouterLink>
</template>

<script setup lang="ts">
import type { RouteNamedMap } from "vue-router/auto-routes";
import SettingsMenuItem from "./SettingsMenuItem.vue";

defineProps<{
  label: string;
  to: keyof RouteNamedMap;
  value?: string;
  style?: "none" | "warning" | "negative";
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();
</script>

<style scoped lang="scss">
.settings-navigation-item {
  display: block;
  text-decoration: none;
  color: inherit;
}
</style>
