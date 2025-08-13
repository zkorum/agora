<template>
  <SettingsMenuItem
    :show-separator="showSeparator"
    :border-radius="borderRadius"
    :variant="item.style"
    @click="item.action"
  >
    <template #left>
      <div class="menu-item__content">
        <div class="menu-item__label">
          {{ item.label }}
        </div>
        <div v-if="item.value" class="menu-item__value">
          {{ item.value }}
        </div>
      </div>
    </template>

    <template #right>
      <ZKIcon
        color="#7D7A85"
        name="mdi-chevron-right"
        size="1.5rem"
        class="menu-item__chevron"
      />
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
.menu-item__content {
  display: grid;
  align-items: center;
  gap: 0.25rem 1rem;
  width: 100%;

  // Large screens: horizontal layout (label | value)
  @media (min-width: 601px) {
    grid-template-columns: auto 1fr;
    grid-template-areas: "label value";

    .menu-item__label {
      grid-area: label;
    }

    .menu-item__value {
      grid-area: value;
      justify-self: end;
    }
  }

  // Small screens: vertical layout (label above value)
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      "label"
      "value";

    .menu-item__label {
      grid-area: label;
    }

    .menu-item__value {
      grid-area: value;
      justify-self: start;
    }
  }
}

.menu-item__label {
  font-size: clamp(1rem, 2.5vw, 1rem);
  font-weight: 500;
  line-height: 1.4;
}

.menu-item__value {
  font-weight: 400;
  color: #6b7280;
  line-height: 1.3;

  // Large screens: normal size, aligned right
  @media (min-width: 601px) {
    font-size: clamp(1rem, 2.5vw, 1rem);
  }

  // Small screens: smaller caption size, aligned left
  @media (max-width: 600px) {
    font-size: clamp(1rem, 2vw, 0.875rem);
    margin-top: 0.125rem;
    opacity: 0.8;
  }
}

.menu-item__chevron {
  flex-shrink: 0;
  align-self: center;

  // Ensure consistent positioning across screen sizes
  @media (max-width: 600px) {
    align-self: flex-start;
    margin-top: 0.125rem;
  }
}
</style>
