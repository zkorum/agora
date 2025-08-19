<template>
  <div class="settings-action-item" @click="action">
    <SettingsMenuItem
      :label="label"
      :value="value"
      :style="style"
      :show-separator="showSeparator"
      :border-radius="borderRadius"
    />
  </div>
</template>

<script setup lang="ts">
import SettingsMenuItem from "./SettingsMenuItem.vue";

defineProps<{
  label: string;
  action: () => void;
  value?: string;
  style?: "none" | "warning" | "negative";
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();
</script>

<style scoped lang="scss">
.settings-action-item {
  cursor: pointer;
}
</style>
