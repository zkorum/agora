<template>
  <div>
    <ZKCard :padding="'2rem'" class="cardStyle">
      <div class="content-container">
        <div class="header">
          <i class="pi pi-link icon" />
          <div class="title">Import Conversation from Polis</div>
        </div>
        <div class="urlInputDiv">
          <div class="description">
            Paste a Polis URL below to import a conversation.
          </div>

          <div class="examples">
            <p class="examples-title">Valid URL examples:</p>
            <ul class="examples-list">
              <li><code>https://pol.is/report/r32beaksmhwesyum6kaur</code></li>
              <li><code>https://pol.is/384anuzye9</code></li>
            </ul>
          </div>

          <div>
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
            <div class="legal-notice">
              By clicking "Import", you confirm that importing the content
              complies with the
              <a
                href="https://pol.is/tos"
                target="_blank"
                rel="noopener noreferrer"
                class="terms-link"
              >
                Pol.is Terms
                <q-icon name="mdi-open-in-new" />
              </a>
              and our
              <RouterLink :to="{ name: '/legal/terms/' }" class="terms-link">
                Terms of Use </RouterLink
              >. Note that the original Polis data are licensed under the
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                class="terms-link"
                >Creative Commons Attribution 4.0 International license
                <q-icon name="mdi-open-in-new" /> </a
              >. Do not import illegal, abusive, or infringing material. Use the
              import API responsibly. Abuse is prohibited.
            </div>
          </div>
        </div>
      </div>
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

.content-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.5rem;
  color: $primary;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: $color-text-strong;
}

.description {
  font-size: 0.95rem;
  color: $color-text-weak;
}

.examples {
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
      word-break: break-all;
      overflow-wrap: break-word;
      max-width: 100%;
    }
  }
}

.legal-notice {
  font-size: 0.8rem;
  color: #6c757d;
  line-height: 1.3;
  padding-top: 0.5rem;
}

.terms-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    color: #1565c0;
  }

  &:visited {
    color: #7b1fa2;
  }
}

.urlInputDiv {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
