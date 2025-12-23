<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-sync section-icon"></i>
        <span>{{ t("asyncStateHandler") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("asyncStateHandlerDescription") }}
      </p>

      <!-- State Control Panel -->
      <div class="control-panel">
        <div class="control-row">
          <span class="control-label">{{ t("currentState") }}:</span>
          <PrimeTag
            :value="currentStateDisplay"
            :severity="currentStateSeverity"
          />
        </div>

        <div class="control-buttons">
          <PrimeButton
            :label="t('simulateLoading')"
            icon="pi pi-spin pi-spinner"
            size="small"
            @click="simulateState('loading')"
          />
          <PrimeButton
            :label="t('simulateError')"
            icon="pi pi-exclamation-triangle"
            severity="danger"
            size="small"
            @click="simulateState('error')"
          />
          <PrimeButton
            :label="t('simulateEmpty')"
            icon="pi pi-inbox"
            severity="warn"
            size="small"
            @click="simulateState('empty')"
          />
          <PrimeButton
            :label="t('simulateSuccess')"
            icon="pi pi-check"
            severity="success"
            size="small"
            @click="simulateState('success')"
          />
          <PrimeButton
            :label="t('simulateRetrying')"
            icon="pi pi-refresh pi-spin"
            severity="info"
            size="small"
            @click="simulateState('retrying')"
          />
          <PrimeButton
            :label="t('resetState')"
            icon="pi pi-undo"
            severity="secondary"
            size="small"
            @click="resetState"
          />
        </div>
      </div>

      <!-- Test Examples -->
      <div class="examples-container">
        <!-- Basic Example -->
        <div class="example-section">
          <h4>{{ t("basicExample") }}</h4>
          <div class="example-content">
            <AsyncStateHandler :query="basicQuery">
              <div class="success-content">
                <i class="pi pi-check-circle success-icon"></i>
                <p>{{ t("sampleData") }}</p>
              </div>
            </AsyncStateHandler>
          </div>
        </div>

        <!-- Customized Example -->
        <div class="example-section">
          <h4>{{ t("configApiExample") }}</h4>
          <div class="example-content">
            <AsyncStateHandler
              :query="customQuery"
              :config="customConfig"
              @retry="handleCustomRetry"
            >
              <div class="success-content">
                <i class="pi pi-star success-icon"></i>
                <p>{{ t("sampleData") }} ({{ t("configApiExample") }})</p>
              </div>
            </AsyncStateHandler>
          </div>
        </div>

        <!-- Custom Retry Handler Example -->
        <div class="example-section">
          <h4>{{ t("customRetryExample") }}</h4>
          <div class="example-content">
            <AsyncStateHandler
              :query="retryQuery"
              :config="retryConfig"
              :on-retry="customRetryHandler"
              @retry="onRetryEmitted"
            >
              <div class="success-content">
                <i class="pi pi-refresh success-icon"></i>
                <p>{{ t("sampleData") }} ({{ t("customRetryExample") }})</p>
              </div>
            </AsyncStateHandler>
          </div>
        </div>

        <!-- Function-based Empty State Example -->
        <div class="example-section">
          <h4>{{ t("functionEmptyExample") }}</h4>
          <div class="example-content">
            <AsyncStateHandler
              :query="functionEmptyQuery"
              :config="functionEmptyConfig"
              :is-empty="customEmptyFunction"
            >
              <div class="success-content">
                <i class="pi pi-function success-icon"></i>
                <p>{{ t("sampleData") }} ({{ t("functionEmptyExample") }})</p>
                <p>Items: {{ mockItems.length }}</p>
              </div>
            </AsyncStateHandler>
          </div>
        </div>

        <!-- Custom Slots Example -->
        <div class="example-section">
          <h4>{{ t("withCustomSlots") }}</h4>
          <div class="example-content">
            <AsyncStateHandler :query="slotsQuery">
              <template #loading>
                <div class="custom-loading">
                  <q-spinner-cube size="40px" color="purple" />
                  <p>{{ t("customLoadingText") }}...</p>
                </div>
              </template>

              <template #error="{ errorMessage, handleRetry }">
                <div class="custom-error">
                  <i class="pi pi-bug error-icon"></i>
                  <h5>Oops! Custom Error</h5>
                  <p v-if="errorMessage">{{ errorMessage }}</p>
                  <PrimeButton
                    label="Try Again"
                    icon="pi pi-refresh"
                    severity="danger"
                    @click="handleRetry"
                  />
                </div>
              </template>

              <template #empty>
                <div class="custom-empty">
                  <i class="pi pi-folder-open empty-icon"></i>
                  <h5>Nothing here yet!</h5>
                  <p>This is a custom empty state message.</p>
                </div>
              </template>

              <div class="success-content">
                <i class="pi pi-sparkles success-icon"></i>
                <p>{{ t("sampleData") }} ({{ t("withCustomSlots") }})</p>
              </div>
            </AsyncStateHandler>
          </div>
        </div>
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed,ref } from "vue";

import {
  type AsyncStateHandlerTestTranslations,
  asyncStateHandlerTestTranslations,
} from "./AsyncStateHandlerTest.i18n";

const { t } = useComponentI18n<AsyncStateHandlerTestTranslations>(
  asyncStateHandlerTestTranslations
);

type MockState =
  | "loading"
  | "error"
  | "empty"
  | "success"
  | "retrying"
  | "idle";

// Define a minimal mock query interface that AsyncStateHandler expects
interface MockQueryInterface {
  data: { value: { message: string } | null };
  error: { value: Error | null };
  isPending: { value: boolean };
  isError: { value: boolean };
  isRefetching: { value: boolean };
  refetch: () => Promise<void>;
}

const currentState = ref<MockState>("idle");
const mockItems = ref<string[]>([]);

// Create mock query objects that satisfy the minimal interface AsyncStateHandler needs
function createMockQuery(state: MockState): MockQueryInterface {
  // Create a minimal mock that provides the properties AsyncStateHandler uses
  return {
    data: ref(state === "success" ? { message: "Success data" } : null),
    error: ref(state === "error" ? new Error("Mock error occurred") : null),
    isPending: ref(state === "loading"),
    isError: ref(state === "error"),
    isRefetching: ref(state === "retrying"),
    refetch: (): Promise<void> => {
      console.log("Refetch called");
      return Promise.resolve();
    },
  };
}

const basicQuery = computed(
  () =>
    createMockQuery(currentState.value) as unknown as UseQueryReturnType<
      unknown,
      Error
    >
);

const customQuery = computed(
  () =>
    createMockQuery(currentState.value) as unknown as UseQueryReturnType<
      unknown,
      Error
    >
);

const retryQuery = computed(
  () =>
    createMockQuery(currentState.value) as unknown as UseQueryReturnType<
      unknown,
      Error
    >
);

const functionEmptyQuery = computed(
  () =>
    createMockQuery(currentState.value) as unknown as UseQueryReturnType<
      unknown,
      Error
    >
);

const slotsQuery = computed(
  () =>
    createMockQuery(currentState.value) as unknown as UseQueryReturnType<
      unknown,
      Error
    >
);

// New Config API examples
const customConfig = computed(() => ({
  loading: {
    text: t("customLoadingText"),
    showSpinner: true,
  },
  error: {
    title: t("customErrorMessage"),
    icon: "pi pi-times-circle",
    iconColor: "red-600",
    retryButtonText: t("customRetryText"),
    showRetryButton: true,
  },
  empty: {
    text: t("customEmptyText"),
    icon: "pi pi-database",
    iconColor: "blue-500",
  },
  retrying: {
    text: "Please wait, retrying...",
  },
}));

const retryConfig = computed(() => ({
  error: {
    title: "Custom Retry Handler Demo",
    retryButtonText: "Custom Retry",
    showRetryButton: true,
  },
}));

const functionEmptyConfig = computed(() => ({
  empty: {
    text: "No items found (function-based check)",
    icon: "pi pi-list",
    iconColor: "orange-500",
  },
}));

const currentStateDisplay = computed(() => {
  const stateMap: Record<MockState, string> = {
    idle: "Idle",
    loading: "Loading",
    error: "Error",
    empty: "Empty",
    success: "Success",
    retrying: "Retrying",
  };
  return stateMap[currentState.value];
});

const currentStateSeverity = computed(() => {
  const severityMap: Record<MockState, string> = {
    idle: "secondary",
    loading: "info",
    error: "danger",
    empty: "warn",
    success: "success",
    retrying: "info",
  };
  return severityMap[currentState.value];
});

// Function-based empty state detection
const customEmptyFunction = (): boolean => {
  return mockItems.value.length === 0;
};

// Custom retry handler function
const customRetryHandler = async (): Promise<void> => {
  console.log("Custom retry handler executed!");
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Add some mock items
  mockItems.value.push(`Item ${Date.now()}`);
};

function simulateState(state: MockState): void {
  currentState.value = state;
  if (state === "success") {
    mockItems.value = ["Sample Item 1", "Sample Item 2"];
  } else if (state === "empty") {
    mockItems.value = [];
  }
}

function resetState(): void {
  currentState.value = "idle";
  mockItems.value = [];
}

function handleCustomRetry(): void {
  console.log("Custom retry handler called (config example)");
}

function onRetryEmitted(): void {
  console.log("Retry event emitted!");
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 2rem 0;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.control-panel {
  background: $grey-1;
  border: 1px solid $grey-3;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  .control-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;

    .control-label {
      font-weight: var(--font-weight-semibold);
      color: $grey-8;
    }
  }

  .control-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

.examples-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.example-section {
  border: 1px solid $grey-3;
  border-radius: 8px;
  overflow: hidden;

  h4 {
    margin: 0;
    padding: 1rem;
    background: $grey-2;
    border-bottom: 1px solid $grey-3;
    font-weight: var(--font-weight-semibold);
    color: $grey-8;
  }

  .example-content {
    padding: 1rem;
    min-height: 200px;
  }
}

.success-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: $green-1;
  border: 1px solid $green-3;
  border-radius: 6px;

  .success-icon {
    color: $green-6;
    font-size: 2rem;
  }

  p {
    margin: 0;
    font-weight: var(--font-weight-semibold);
    color: $green-8;
  }
}

.custom-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: $purple-7;

  p {
    margin: 0;
    font-weight: var(--font-weight-semibold);
  }
}

.custom-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;

  .error-icon {
    color: $red-6;
    font-size: 3rem;
  }

  h5 {
    margin: 0;
    color: $red-7;
    font-weight: var(--font-weight-bold);
  }

  p {
    margin: 0;
    color: $grey-7;
  }
}

.custom-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;

  .empty-icon {
    color: $blue-5;
    font-size: 3rem;
  }

  h5 {
    margin: 0;
    color: $blue-7;
    font-weight: var(--font-weight-bold);
  }

  p {
    margin: 0;
    color: $grey-7;
  }
}
</style>
