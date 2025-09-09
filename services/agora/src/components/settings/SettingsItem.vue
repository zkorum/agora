<template>
  <RouterLink
    v-if="item.type === 'navigation'"
    v-slot="{ navigate }"
    :to="item.to"
    custom
  >
    <!-- TODO: ACCESSIBILITY - Change <div> to semantic <button> element for keyboard accessibility -->
    <!-- Settings navigation items should be keyboard navigable for users with motor disabilities -->
    <div class="settings-item" @click="handleItemClick($event, navigate)">
      <SettingsMenuItem
        :label="item.label"
        :value="item.value"
        :style="item.style"
        :show-separator="showSeparator"
        :border-radius="borderRadius"
      />
    </div>
  </RouterLink>
  <!-- TODO: ACCESSIBILITY - Change <div> to semantic <button> element for keyboard accessibility -->
  <!-- Settings action items should be keyboard navigable for users with motor disabilities -->
  <div v-else class="settings-item" @click="handleItemClick($event)">
    <SettingsMenuItem
      :label="item.label"
      :value="item.value"
      :style="item.style"
      :show-separator="showSeparator"
      :border-radius="borderRadius"
    />
  </div>
</template>

<script setup lang="ts">
import type { SettingsInterface } from "src/utils/component/settings/settings";
import SettingsMenuItem from "./SettingsMenuItem.vue";

const props = defineProps<{
  item: SettingsInterface;
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();

function handleItemClick(event: Event, navigate?: () => void) {
  if (props.item.type === "navigation") {
    if (navigate) {
      navigate();
    }
  } else {
    // Handle action items
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
}
</style>
