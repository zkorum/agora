<template>
  <div class="zk-info-banner">
    <ZKIcon
      name="mdi:information-outline"
      size="1.25rem"
      color="var(--p-blue-600)"
    />
    <div class="banner-content">
      <span class="banner-text">{{ message }}</span>
      <PrimeButton
        v-if="actionLabel"
        :label="actionLabel"
        severity="info"
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

defineProps<Props>();

const emit = defineEmits<{
  action: [];
}>();

export interface Props {
  message: string;
  actionLabel?: string;
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
