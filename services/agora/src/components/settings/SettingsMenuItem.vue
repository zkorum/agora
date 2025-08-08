<template>
  <div>
    <div
      class="menu-item"
      :class="{
        'menu-item--warning': variant === 'warning',
        'menu-item--negative': variant === 'negative',
        'menu-item--rounded-top':
          borderRadius === 'top' || borderRadius === 'both',
        'menu-item--rounded-bottom':
          borderRadius === 'bottom' || borderRadius === 'both',
      }"
      @click="$emit('click')"
    >
      <div class="menu-item__left">
        <slot name="left"></slot>
      </div>

      <div class="menu-item__right">
        <slot name="right"></slot>
      </div>
    </div>

    <q-separator v-if="showSeparator" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showSeparator?: boolean;
  borderRadius?: "none" | "top" | "bottom" | "both";
  variant?: "none" | "warning" | "negative";
}>();

defineEmits<{
  click: [];
}>();
</script>

<style scoped lang="scss">
.menu-item {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 1rem;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.07);
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
</style>
