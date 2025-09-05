<template>
  <div>
    <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
    <!-- Settings menu item should be keyboard navigable for users with motor disabilities -->
    <div
      class="menu-item"
      :class="{
        'menu-item--warning': style === 'warning',
        'menu-item--negative': style === 'negative',
        'menu-item--rounded-top':
          borderRadius === 'top' || borderRadius === 'both',
        'menu-item--rounded-bottom':
          borderRadius === 'bottom' || borderRadius === 'both',
      }"
    >
      <div class="menu-item__left">
        <div class="menu-item__content">
          <slot name="content">
            <div class="menu-item__label">
              {{ label }}
            </div>
            <div v-if="value" class="menu-item__value">
              {{ value }}
            </div>
          </slot>
        </div>
      </div>

      <div class="menu-item__right">
        <slot name="right-icon">
          <ZKIcon
            color="#7D7A85"
            name="mdi-chevron-right"
            size="1.5rem"
            class="menu-item__chevron"
          />
        </slot>
      </div>
    </div>

    <q-separator v-if="showSeparator" />
  </div>
</template>

<script setup lang="ts">
import ZKIcon from "../ui-library/ZKIcon.vue";

defineProps<{
  label: string;
  value?: string;
  style?: "none" | "warning" | "negative";
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
}>();
</script>

<style scoped lang="scss">
.menu-item {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 1rem;
  transition: background-color 0.3s ease;
  text-decoration: none;
  color: inherit;

  // Only apply hover effects on devices that support hovering (not touch)
  @media (hover: hover) {
    &:hover {
      background-color: rgba(0, 0, 0, 0.07);
    }
  }

  &--rounded-top {
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
  }

  &--rounded-bottom {
    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
  }

  &--warning {
    color: $warning;
  }

  &--negative {
    color: $negative;
  }
}

.menu-item__left {
  flex: 1;
  display: flex;
  align-items: center;
}

.menu-item__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.menu-item__content {
  display: grid;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
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

.menu-item__label {
  font-size: clamp(1rem, 2.5vw, 1rem);
  font-weight: 500;
  line-height: 1.4;
}

.menu-item__value {
  font-weight: 400;
  color: #6b7280;
  line-height: 1.3;
  font-size: clamp(1rem, 2vw, 0.875rem);
  margin-top: 0.125rem;
  opacity: 0.8;
}

.menu-item__chevron {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 0.125rem;
}
</style>
