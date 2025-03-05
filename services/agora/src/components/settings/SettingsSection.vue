<template>
  <div>
    <div class="container backgroundColor">
      <div class="flexStyle innerBackground">
        <div v-for="(item, index) in settingsItemList" :key="item.label">
          <ZKHoverEffect :enable-hover="true">
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
                <ZKIcon color="#7D7A85" name="mdi-chevron-right" size="24px" />
              </div>
            </div>

            <q-separator v-if="index != settingsItemList.length - 1" />
          </ZKHoverEffect>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
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

.flexStyle {
  display: flex;
  flex-direction: column;
}

.container {
  margin-bottom: 2rem;
}

.isWarningStyle {
  color: $warning;
}

.isNegativeStyle {
  color: $negative;
}

.backgroundColor {
  background-color: white;
  border-radius: 20px;
}

.innerBackground {
}
</style>
