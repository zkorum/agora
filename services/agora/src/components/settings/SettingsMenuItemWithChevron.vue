<template>
  <SettingsMenuItem
    :show-separator="showSeparator"
    :border-radius="borderRadius"
    :variant="item.style"
    @click="item.action"
  >
    <template #left>
      <div class="menu-item__label">
        {{ item.label }}
      </div>
    </template>

    <template #right>
      <ZKIcon color="#7D7A85" name="mdi-chevron-right" size="1.5rem" />
    </template>
  </SettingsMenuItem>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import SettingsMenuItem from "./SettingsMenuItem.vue";
import ZKIcon from "../ui-library/ZKIcon.vue";

defineProps<{
  item: SettingsInterface;
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();
</script>

<style scoped lang="scss">
.menu-item__label {
  font-size: 14px;
  font-weight: 500;
}
</style>
