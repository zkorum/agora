<template>
  <div class="settings-section">
    <div class="settings-background">
      <template v-for="(item, index) in settingsItemList" :key="item.label">
        <SettingsItem
          :item="item"
          :show-separator="index < settingsItemList.length - 1"
          :border-radius="
            settingsItemList.length === 1
              ? 'both'
              : index === 0
                ? 'top'
                : index === settingsItemList.length - 1
                  ? 'bottom'
                  : 'none'
          "
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import SettingsItem from "./SettingsItem.vue";

defineProps<{
  settingsItemList: SettingsInterface[];
}>();
</script>

<style scoped lang="scss">
.settings-section {
  margin-bottom: 2rem;
}

.settings-background {
  background-color: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}
</style>
