<template>
  <div>
    <ZKCard padding="2rem" class="cardStyle">
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
              <li><code>https://pol.is/report/&lt;report_id&gt;</code></li>
              <li><code>https://pol.is/&lt;conversation_id&gt;</code></li>
              <li>
                <code
                  >https://polis.deepgov.org/conversation/report/&lt;report_id&gt;</code
                >
              </li>
              <li>
                <code
                  >https://polis.deepgov.org/conversation/&lt;conversation_id&gt;</code
                >
              </li>
            </ul>
          </div>

          <div>
            <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
            <q-input
              v-model="model"
              :placeholder="t('urlPlaceholder')"
              outlined
              dense
              :error="showError"
              :error-message="errorMessage"
            >
            </q-input>
            <div class="legal-notice">
              <i18n-t keypath="importConversation.legalNotice" tag="p">
                <!-- TODO: move to 't' and v-html. This is loaded from global i18n -->
                <!-- Polis Terms link -->
                <template #polisTerms>
                  <a
                    href="https://pol.is/tos"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="terms-link"
                  >
                    {{ t("polisTerms") }} <q-icon name="mdi-open-in-new" />
                  </a>
                </template>

                <!-- Local Terms of Use link -->
                <template #termsOfUse>
                  <RouterLink
                    :to="{ name: '/legal/terms/' }"
                    class="terms-link"
                  >
                    {{ t("termsOfUse") }}
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
                    {{ t("ccLicense") }} <q-icon name="mdi-open-in-new" />
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
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import {
  type PolisUrlInputTranslations,
  polisUrlInputTranslations,
} from "./PolisUrlInput.i18n";

// Establish global i18n scope for <i18n-t> component
useI18n();

const { t } = useComponentI18n<PolisUrlInputTranslations>(
  polisUrlInputTranslations
);

const model = defineModel<string>({ required: true });
const validationError = defineModel<string>("validationError", {
  required: false,
  default: "",
});
const showValidationError = defineModel<boolean>("showValidationError", {
  required: false,
  default: false,
});

const errorMessage = computed(() => validationError.value);
const showError = computed(() => showValidationError.value);

// Expose methods to parent component (for backward compatibility if needed)
defineExpose({
  validate: () => !showError.value && model.value !== "",
  clearError: () => {
    showValidationError.value = false;
  },
});
</script>

<style scoped lang="scss">
.cardStyle {
  background-color: $color-background-default;
  border: 1px solid $color-border-weak;
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
