<template>
  <div>
    <ZKCard :padding="'2rem'" class="cardStyle">
      <div class="header">
        <i class="pi pi-link icon" />
        <h3 class="title">Import Conversation from Polis</h3>
      </div>
      <p class="description">
        Paste a Polis URL below to import a conversation.
      </p>
      <div class="examples">
        <p class="examples-title">Valid URL examples:</p>
        <ul class="examples-list">
          <li><code>https://pol.is/report/r32beaksmhwesyum6kaur</code></li>
          <li><code>https://pol.is/384anuzye9</code></li>
        </ul>
      </div>
      <q-input
        v-model="model"
        placeholder="e.g., https://pol.is/xxxxx"
        outlined
        dense
        :error="showError"
        :error-message="errorMessage"
        @update:model-value="handleInput"
      >
      </q-input>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { storeToRefs } from "pinia";
import ZKCard from "../ui-library/ZKCard.vue";

const model = defineModel<string>({ required: true });

const { updatePolisUrl, validatePolisUrlField } = useNewPostDraftsStore();
const { validationState } = storeToRefs(useNewPostDraftsStore());

const errorMessage = computed(() => validationState.value.polisUrl.error);
const showError = computed(() => validationState.value.polisUrl.showError);

function validate(): boolean {
  const result = validatePolisUrlField();
  return result.success;
}

function clearError() {
  // This will be handled automatically by the centralized mutation function
}

// Watch for model changes and update through centralized mutation
function handleInput(value: string) {
  updatePolisUrl(value);
}

// Expose methods to parent component
defineExpose({
  validate,
  clearError,
});
</script>

<style scoped lang="scss">
.cardStyle {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.icon {
  font-size: 1.5rem;
  color: $primary;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: $color-text-strong;
  margin: 0;
}

.description {
  font-size: 0.95rem;
  color: $color-text-weak;
  margin-bottom: 1rem;
}

.examples {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid $primary;
}

.examples-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: $color-text-strong;
  margin: 0 0 0.5rem 0;
}

.examples-list {
  margin: 0;
  padding-left: 1rem;

  li {
    font-size: 0.8rem;
    color: $color-text-weak;
    margin-bottom: 0.25rem;

    &:last-child {
      margin-bottom: 0;
    }

    code {
      background-color: #e9ecef;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      font-size: 0.75rem;
      color: #495057;
    }
  }
}
</style>
