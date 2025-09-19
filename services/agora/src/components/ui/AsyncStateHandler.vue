<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading && !hasError" class="asyncStateMessage">
      <slot name="loading">
        <q-spinner-dots size="50px" color="primary" />
        <div class="stateText">{{ loadingText || t("loading") }}</div>
      </slot>
    </div>

    <!-- Retrying state -->
    <div v-if="isRetrying" class="asyncStateMessage">
      <slot name="retrying">
        <q-spinner-dots size="50px" color="primary" />
        <div class="stateText">{{ retryingText || t("retrying") }}</div>
      </slot>
    </div>

    <!-- Error state -->
    <div v-if="hasError && !isLoading && !isRetrying" class="asyncStateMessage">
      <slot
        name="error"
        :error-message="errorMessage"
        :handle-retry="handleRetry"
      >
        <q-icon :name="errorIcon" size="50px" :color="errorIconColor" />
        <div class="errorContent">
          <div class="errorTitle">{{ errorTitle || t("errorTitle") }}</div>
          <div v-if="errorMessage" class="errorDetail">{{ errorMessage }}</div>
          <div v-else-if="defaultErrorMessage" class="errorDetail">
            {{ defaultErrorMessage }}
          </div>
          <div v-else class="errorDetail">
            {{ t("defaultErrorMessage") }}
          </div>
        </div>
        <PrimeButton
          v-if="showRetry"
          :label="retryLabel || t('retry')"
          icon="pi pi-refresh"
          :loading="isRetrying"
          severity="primary"
          class="retryButton"
          @click="handleRetry"
        />
      </slot>
    </div>

    <!-- Empty state (no errors, not loading) -->
    <div
      v-if="isEmpty && !isLoading && !hasError && !isRetrying"
      class="asyncStateMessage"
    >
      <slot name="empty">
        <q-icon :name="emptyIcon" size="50px" :color="emptyIconColor" />
        <div class="stateText">{{ emptyText || t("emptyMessage") }}</div>
      </slot>
    </div>

    <!-- Success state with data -->
    <div v-if="!isEmpty && !isLoading">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { UseQueryReturnType } from "@tanstack/vue-query";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  asyncStateHandlerTranslations,
  type AsyncStateHandlerTranslations,
} from "./AsyncStateHandler.i18n";

const { t } = useComponentI18n<AsyncStateHandlerTranslations>(
  asyncStateHandlerTranslations
);

const emit = defineEmits(["retry"]);

const props = withDefaults(
  defineProps<{
    query: UseQueryReturnType<unknown, Error>;
    // Optional customization props
    loadingText?: string;
    retryingText?: string;
    errorTitle?: string;
    defaultErrorMessage?: string;
    emptyText?: string;
    retryLabel?: string;
    // Icon customization
    errorIcon?: string;
    errorIconColor?: string;
    emptyIcon?: string;
    emptyIconColor?: string;
    // Optional override for empty state logic
    customIsEmpty?: boolean;
    // Optional override for retry functionality
    isRetryable?: boolean;
  }>(),
  {
    loadingText: undefined,
    retryingText: undefined,
    errorTitle: undefined,
    defaultErrorMessage: undefined,
    emptyText: undefined,
    retryLabel: undefined,
    errorIcon: "error_outline",
    errorIconColor: "negative",
    emptyIcon: "inbox",
    emptyIconColor: "grey-5",
    customIsEmpty: undefined,
    isRetryable: undefined,
  }
);

// Automatically extract states from the query using native Tanstack Query types
const isLoading = computed(() => props.query.isPending.value);
const hasError = computed(() => props.query.isError.value);
const errorMessage = computed(() => {
  if (!props.query.error.value) return null;
  // Handle different error types
  const error = props.query.error.value;
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  // For other error types, try to extract message property if it exists
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" ? message : "An error occurred";
  }
  // Fallback for primitive error types
  return "An error occurred";
});
const isRetrying = computed(() => props.query.isRefetching.value);
const isEmpty = computed(() =>
  props.customIsEmpty !== undefined
    ? props.customIsEmpty
    : !props.query.data.value
);
const showRetry = computed(
  () =>
    props.isRetryable !== undefined
      ? props.isRetryable
      : props.query.isError.value // Default: allow retry if there's an error
);

function handleRetry(): void {
  if (props.query.refetch) {
    void props.query.refetch();
  }
  // Still emit retry event for any custom handling
  emit("retry");
}
</script>

<style scoped lang="scss">
.asyncStateMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 4rem;
  text-align: center;
}

.stateText {
  font-size: 1rem;
  color: var(--q-dark);
  opacity: 0.7;
  margin-top: 1rem;
}

.errorContent {
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
