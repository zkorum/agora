<template>
  <div class="settings-section">
    <ul class="settings-background" role="list">
      <li
        v-for="(item, index) in settingsItemList"
        :key="item.key ?? item.label ?? index"
        role="listitem"
      >
        <ListItem
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
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import ListItem from "./ListItem.vue";

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
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  margin-top: 0.5rem;
}
</style>
