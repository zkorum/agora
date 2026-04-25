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
        <p class="control-help">
          {{ currentStateExplanation }}
        </p>

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
import Button from "primevue/button";
import Card from "primevue/card";
import Tag from "primevue/tag";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed, type Ref,ref } from "vue";

import {
  type AsyncStateHandlerTestTranslations,
  asyncStateHandlerTestTranslations,
} from "./AsyncStateHandlerTest.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
    PrimeTag: Tag,
  },
});

const { t } = useComponentI18n<AsyncStateHandlerTestTranslations>(
  asyncStateHandlerTestTranslations
);

type MockState =
  | "loading"
  | "error"
  | "empty"
  | "success"
  | "retrying";

const defaultState: MockState = "success";

// Define a minimal mock query interface that AsyncStateHandler expects
interface MockQueryInterface {
  data: Ref<{ message: string } | null>;
  error: Ref<Error | null>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  isRefetching: Ref<boolean>;
  refetch: () => Promise<void>;
}

const currentState = ref<MockState>(defaultState);
const mockItems = ref<string[]>(["Sample Item 1", "Sample Item 2"]);

// Create mock query objects that satisfy the minimal interface AsyncStateHandler needs
function createMockQuery(state: MockState): MockQueryInterface {
  const hasMockData = state === "success" || state === "retrying";

  // Create a minimal mock that provides the properties AsyncStateHandler uses
  return {
    data: ref(hasMockData ? { message: "Success data" } : null),
    error: ref(state === "error" ? new Error("Mock error occurred") : null),
    isPending: ref(state === "loading"),
    isError: ref(state === "error"),
    isRefetching: ref(state === "retrying"),
    refetch: async (): Promise<void> => {},
  };
}

const basicQuery = computed(() => createMockQuery(currentState.value));

const customQuery = computed(() => createMockQuery(currentState.value));

const retryQuery = computed(() => createMockQuery(currentState.value));

const functionEmptyQuery = computed(() => createMockQuery(currentState.value));

const slotsQuery = computed(() => createMockQuery(currentState.value));

// New Config API examples
const customConfig = computed(() => ({
  loading: {
    text: t("customLoadingText"),
    showSpinner: true,
  },
  error: {
    title: t("customErrorMessage"),
    icon: "mdi-close-circle-outline",
    iconColor: "negative",
    retryButtonText: t("customRetryText"),
    showRetryButton: true,
  },
  empty: {
    text: t("customEmptyText"),
    icon: "storage",
    iconColor: "blue-5",
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
    icon: "format_list_bulleted",
    iconColor: "orange-5",
  },
}));

const currentStateDisplay = computed(() => {
  const stateMap: Record<MockState, string> = {
    loading: "Loading",
    error: "Error",
    empty: "Empty",
    success: "Success",
    retrying: "Background refresh",
  };
  return stateMap[currentState.value];
});

const currentStateSeverity = computed(() => {
  const severityMap: Record<MockState, string> = {
    loading: "info",
    error: "danger",
    empty: "warn",
    success: "success",
    retrying: "info",
  };
  return severityMap[currentState.value];
});

const currentStateExplanation = computed(() => {
  switch (currentState.value) {
    case "loading":
      return "Initial load with no cached data yet. The handler should replace content with loading UI.";
    case "error":
      return "Failed load. The handler should replace content with an error state and optional retry action.";
    case "empty":
      return "Successful request with no usable data. The handler should show the empty state instead of the content slot.";
    case "success":
      return "Successful request with data. The handler should render the content slot normally.";
    case "retrying":
      return "Background refresh after a prior success. Existing content stays visible and the handler does not add inline UI for this state.";
  }

  return "";
});

// Function-based empty state detection
const customEmptyFunction = (): boolean => {
  return mockItems.value.length === 0;
};

// Custom retry handler function
const customRetryHandler = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  mockItems.value.push(`Item ${Date.now()}`);
};

function simulateState(state: MockState): void {
  currentState.value = state;
  if (state === "success" || state === "retrying") {
    mockItems.value = ["Sample Item 1", "Sample Item 2"];
  } else {
    mockItems.value = [];
  }
}

function resetState(): void {
  currentState.value = defaultState;
  mockItems.value = ["Sample Item 1", "Sample Item 2"];
}

function handleCustomRetry(): void {}

function onRetryEmitted(): void {}
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

.control-help {
  margin: 0 0 1rem 0;
  color: $grey-7;
  font-size: 0.95rem;
  line-height: 1.5;
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
