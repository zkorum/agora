<template>
  <div class="zk-info-banner" :class="`zk-info-banner--${variant}`">
    <ZKIcon
      :name="
        variant === 'warning' ? 'mdi:alert-outline' : 'mdi:information-outline'
      "
      size="1.25rem"
      :color="variant === 'warning' ? '#8a5a00' : 'var(--p-blue-600)'"
    />
    <div class="banner-content">
      <span class="banner-text">{{ message }}</span>
      <PrimeButton
        v-if="actionLabel"
        :label="actionLabel"
        :severity="variant === 'warning' ? 'warn' : 'info'"
        size="small"
        @click="emit('action')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";

import ZKIcon from "./ZKIcon.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

withDefaults(defineProps<Props>(), {
  actionLabel: undefined,
  variant: "info",
});

const emit = defineEmits<{
  action: [];
}>();

export interface Props {
  message: string;
  actionLabel?: string;
  variant?: "info" | "warning";
}
</script>

<style scoped lang="scss">
.zk-info-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: var(--p-blue-50);
  border: 1px solid var(--p-blue-200);
  border-radius: 8px;
}

.zk-info-banner--warning {
  background-color: #fff4df;
  border-color: #f3d59b;

  .banner-text {
    color: #8a5a00;
  }
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.banner-text {
  flex: 1;
  color: var(--p-blue-900);
  font-size: 0.95rem;
}
</style>
