<template>
  <SettingsContainer>
    <div v-for="(item, index) in settingsItemList" :key="item.label">
      <div
        class="menuItem"
        :class="{
          isWarningStyle: item.style == 'warning',
          isNegativeStyle: item.style == 'negative',
        }"
        @click="item.action"
      >
        <div>
          {{ item.label }}
        </div>

        <div>
          <ZKIcon color="#7D7A85" name="mdi-chevron-right" size="1.5rem" />
        </div>
      </div>

      <q-separator v-if="index != settingsItemList.length - 1" />
    </div>
  </SettingsContainer>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import SettingsContainer from "./SettingsContainer.vue";
import ZKIcon from "../ui-library/ZKIcon.vue";

defineProps<{
  settingsItemList: SettingsInterface[];
}>();
</script>

<style scoped lang="scss">
.menuItem {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 1rem;
}

.isWarningStyle {
  color: $warning;
}

.isNegativeStyle {
  color: $negative;
}
</style>
