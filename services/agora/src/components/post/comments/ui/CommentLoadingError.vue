<template>
  <div class="errorMessage">
    <q-icon :name="icon" size="50px" :color="iconColor" />
    <div class="errorText">
      <div class="errorTitle">{{ title }}</div>
      <div v-if="message" class="errorDetail">{{ message }}</div>
      <div v-else-if="defaultMessage" class="errorDetail">
        {{ defaultMessage }}
      </div>
    </div>
    <PrimeButton
      v-if="showRetry"
      :label="retryLabel"
      icon="pi pi-refresh"
      :loading="isRetrying"
      severity="primary"
      class="retryButton"
      @click="handleRetry"
    />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(["retry"]);

defineProps<{
  title: string;
  message?: string | null;
  defaultMessage?: string;
  showRetry?: boolean;
  retryLabel?: string;
  isRetrying?: boolean;
  icon?: string;
  iconColor?: string;
}>();

function handleRetry(): void {
  emit("retry");
}
</script>

<style scoped lang="scss">
.errorMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.errorText {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
}

.errorTitle {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: var(--q-negative);
}

.errorDetail {
  font-size: 0.9rem;
  color: var(--q-dark);
  opacity: 0.8;
  line-height: 1.4;
}

.retryButton {
  margin-top: 0.5rem;
}
</style>
