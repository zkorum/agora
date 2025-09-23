<template>
  <div class="async-state-handler">
    <!-- Error state -->
    <div
      v-if="isError && !isPending && !isRefetching"
      class="asyncStateMessage"
    >
      <slot
        name="error"
        :error-message="errorMessage"
        :handle-retry="handleRetry"
      >
        <q-icon
          :name="config.error?.icon || 'error_outline'"
          size="50px"
          :color="config.error?.iconColor || 'negative'"
        />
        <div class="errorContent">
          <div class="errorTitle">
            {{ config.error?.title || t("errorTitle") }}
          </div>
          <div v-if="errorMessage" class="errorDetail">
            {{ errorMessage }}
          </div>
          <div v-else-if="config.error?.message" class="errorDetail">
            {{ config.error.message }}
          </div>
          <div v-else class="errorDetail">
            {{ t("defaultErrorMessage") }}
          </div>
        </div>
        <PrimeButton
          v-if="shouldShowRetryButton"
          :label="config.error?.retryButtonText || t('retry')"
          icon="pi pi-refresh"
          severity="primary"
          class="retryButton"
          @click="handleRetry"
        />
      </slot>
    </div>

    <!-- Empty state (no errors, not loading) -->
    <div
      v-else-if="computedIsEmpty && !isPending && !isError && !isRefetching"
      class="asyncStateMessage"
    >
      <slot name="empty">
        <q-icon
          :name="config.empty?.icon || 'inbox'"
          size="50px"
          :color="config.empty?.iconColor || 'grey-5'"
        />
        <div class="stateText">
          {{ config.empty?.text || t("emptyMessage") }}
        </div>
      </slot>
    </div>

    <!-- Success state with data or loading state -->
    <div
      v-else
      class="contentWrapper"
      :class="{ 'is-loading': isPending || isRefetching }"
    >
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

type ConstrainedQueryType = Pick<
  UseQueryReturnType<unknown, Error>,
  "isPending" | "isError" | "error" | "isRefetching" | "data" | "refetch"
>;

interface LoadingConfig {
  readonly text?: string;
  readonly showSpinner?: boolean;
}

interface ErrorConfig {
  readonly title?: string;
  readonly message?: string;
  readonly icon?: string;
  readonly iconColor?: string;
  readonly showRetryButton?: boolean;
  readonly retryButtonText?: string;
}

interface EmptyConfig {
  readonly text?: string;
  readonly icon?: string;
  readonly iconColor?: string;
}

interface RetryingConfig {
  readonly text?: string;
}

interface AsyncStateConfig {
  readonly loading?: LoadingConfig;
  readonly error?: ErrorConfig;
  readonly empty?: EmptyConfig;
  readonly retrying?: RetryingConfig;
}

const emit = defineEmits<{
  retry: [];
}>();

interface Props {
  query: ConstrainedQueryType;
  config?: AsyncStateConfig;
  isEmpty?: boolean | (() => boolean);
  onRetry?: () => void | Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
  isEmpty: undefined,
  onRetry: undefined,
});

const isPending = computed((): boolean => props.query.isPending.value);
const isError = computed((): boolean => props.query.isError.value);
const isRefetching = computed((): boolean => props.query.isRefetching.value);

const errorMessage = computed((): string | null => {
  if (!props.query.error.value) return null;

  const error = props.query.error.value;

  // Handle Error instances first
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle objects with message property
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return null;
});

const computedIsEmpty = computed((): boolean => {
  if (props.isEmpty === undefined) {
    // Default logic: empty if no data
    return !props.query.data.value;
  }

  if (typeof props.isEmpty === "function") {
    return props.isEmpty();
  }

  return props.isEmpty;
});

const shouldShowRetryButton = computed((): boolean => {
  // If explicitly configured, use that setting
  if (props.config.error?.showRetryButton !== undefined) {
    return props.config.error.showRetryButton;
  }

  // Default: show retry button if there's an error
  return isError.value;
});

async function handleRetry(): Promise<void> {
  try {
    // Call custom retry handler if provided
    if (props.onRetry) {
      await props.onRetry();
    } else {
      // Default behavior: refetch the query
      if (props.query.refetch) {
        await props.query.refetch();
      }
    }
  } catch (retryError: unknown) {
    const errorMsg =
      retryError instanceof Error
        ? retryError.message
        : "Unknown retry error occurred";
    console.error("Retry failed:", errorMsg);
  } finally {
    // Always emit retry event for any additional handling
    emit("retry");
  }
}
</script>

<style scoped lang="scss">
.async-state-handler {
  position: relative;
  min-height: 60px; /* Minimum height to prevent layout collapse */
}

.asyncStateMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 4rem;
  text-align: center;
}

.contentWrapper {
  position: relative;
  width: 100%;
  transition: opacity 0.3s ease-in-out;

  &.is-loading {
    opacity: 0.6; /* Dim content to ~60% during loading */
    pointer-events: none; /* Disable interactions during loading */
  }
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
