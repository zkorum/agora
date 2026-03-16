<template>
  <span v-if="$slots.default" class="zkBadgeWrapper">
    <slot />
    <q-badge
      v-if="showBadge"
      :color="count ? 'red-light' : 'red'"
      rounded
      floating
      :label="count ? formatAmount(count) : undefined"
      :class="{ 'dot-only': !count }"
    />
  </span>
  <q-badge
    v-else-if="showBadge"
    :color="count ? 'red-light' : 'red'"
    rounded
    floating
    :label="count ? formatAmount(count) : undefined"
    :class="{ 'dot-only': !count }"
  />
</template>

<script setup lang="ts">
import { formatAmount } from "src/utils/common";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    count?: number;
  }>(),
  {
    visible: false,
    count: undefined,
  }
);

const showBadge = computed(() =>
  props.count ? props.count > 0 : props.visible
);
</script>

<style lang="scss" scoped>
.dot-only {
  min-width: 8px;
  min-height: 8px;
  padding: 0;
}

.zkBadgeWrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.zkBadgeWrapper :deep(.q-badge--floating) {
  top: 5px;
  right: 0;
}
</style>
