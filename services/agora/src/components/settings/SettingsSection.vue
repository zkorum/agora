<template>
  <div>
    <div class="container">
      <ZKCard padding="0rem">
        <div class="flexStyle">
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
                  <q-icon name="mdi-chevron-right" size="2rem" />
                </div>
              </div>

              <q-separator v-if="index != settingsItemList.length - 1" />
            </ZKHoverEffect>
          </div>
        </div>
      </ZKCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type SettingsInterface } from "src/utils/component/settings/settings";
import ZKCard from "../ui-library/ZKCard.vue";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";

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
  font-size: 1rem;
  cursor: pointer;
  padding: 1rem;
}

.flexStyle {
  display: flex;
  flex-direction: column;
}

.container {
  padding-bottom: 2rem;
}

.isWarningStyle {
  color: $warning;
}

.isNegativeStyle {
  color: $negative;
}
</style>
