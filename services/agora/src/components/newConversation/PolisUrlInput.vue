<template>
  <div>
    <ZKCard :padding="'2rem'" class="cardStyle">
      <div class="content-container">
        <div class="header">
          <i class="pi pi-link icon" />
          <div class="title">{{ t("importTitle") }}</div>
        </div>
        <div class="urlInputDiv">
          <div class="description">
            {{ t("description") }}
          </div>

          <div class="examples">
            <p class="examples-title">{{ t("validUrlExamples") }}</p>
            <ul class="examples-list">
              <li><code>{{ "https://pol.is/report/<report_id>" }}</code></li>
              <li><code>{{ "https://pol.is/<conversation_id>"}}</code></li>
              <li>
                <code
                >{{ "https://polis.deepgov.org/conversation/report/<report_id>"}}</code
                >
              </li>
              <li>
                <code
                >{{"https://polis.deepgov.org/conversation/<conversation_id>"}}</code
                >
              </li>
            </ul>
          </div>

          <div>
            <q-input
              v-model="model"
              :placeholder="t('urlPlaceholder')"
              outlined
              dense
              :error="showError"
              :error-message="errorMessage"
              @update:model-value="handleInput"
            >
            </q-input>
            <div class="legal-notice">
              <i18n-t keypath="importConversation.legalNotice" tag="p">
                <!-- Polis Terms link -->
                <template #polisTerms>
                  <a
                    href="https://pol.is/tos"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="terms-link"
                  >
                    {{ t('polisTerms') }} <q-icon name="mdi-open-in-new" />
                  </a>
                </template>

                <!-- Local Terms of Use link -->
                <template #termsOfUse>
                  <RouterLink :to="{ name: '/legal/terms/' }" class="terms-link">
                    {{ t('termsOfUse') }}
                  </RouterLink>
                </template>

                <!-- Creative Commons license link -->
                <template #ccLicense>
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="terms-link"
                  >
                    {{ t('ccLicense') }} <q-icon name="mdi-open-in-new" />
                  </a>
                </template>
              </i18n-t>
            </div>
          </div>
        </div>
      </div>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { storeToRefs } from "pinia";
import ZKCard from "../ui-library/ZKCard.vue";
import {
  polisUrlInputTranslations,
  type PolisUrlInputTranslations,
} from "./PolisUrlInput.i18n";

// Establish global i18n scope for <i18n-t> component
useI18n();

const { t } = useComponentI18n<PolisUrlInputTranslations>(
  polisUrlInputTranslations
);

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
  font-weight: var(--font-weight-semibold);
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
  font-weight: var(--font-weight-semibold);
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
  font-weight: var(--font-weight-medium);

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
