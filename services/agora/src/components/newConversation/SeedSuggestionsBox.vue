<template>
  <section
    class="suggestions-box"
    :class="{ 'is-not-confident': tip !== undefined }"
    :aria-label="t('aiSuggestionsButton')"
  >
    <div class="suggestions-header">
      <i class="pi pi-lightbulb suggestions-icon" aria-hidden="true" />
      <span class="suggestions-title">{{ t("aiSuggestionsButton") }}</span>
    </div>
    <p class="suggestions-note">
      {{
        tip === undefined ? t("aiSuggestionsNote") : t("aiSuggestionsNotClear")
      }}
    </p>

    <div v-if="tip !== undefined" class="suggestions-tip">
      <p class="suggestions-tip-text">{{ tip }}</p>
    </div>

    <ul v-if="suggestions.length > 0" class="suggestions-list">
      <li
        v-for="suggestion in suggestions"
        :key="suggestion.suggestionId"
        class="suggestion-item"
      >
        <p class="suggestion-text">{{ suggestion.text }}</p>
        <div class="suggestion-actions">
          <PrimeButton
            :label="t('aiSuggestionAdd')"
            size="small"
            :disabled="isFrozen || !canTakeSuggestion"
            @click="emit('add', suggestion.suggestionId)"
          />
          <PrimeButton
            :label="t('aiSuggestionDiscard')"
            size="small"
            text
            severity="secondary"
            :disabled="isFrozen"
            @click="emit('discard', suggestion.suggestionId)"
          />
        </div>
      </li>
    </ul>

    <div class="box-footer">
      <SpaLink
        v-if="tip !== undefined"
        :to="{ name: '/conversation/new/create/' }"
        deferred
        class="edit-conversation-link"
        @click="emit('editConversation', $event)"
      >
        <ZKIcon
          :name="backIcon"
          size="1.1rem"
          color="currentColor"
          aria-hidden="true"
        />
        {{ t("aiSuggestionsEditConversation") }}
      </SpaLink>
      <PrimeButton
        v-else
        :label="generateMoreLabel"
        size="small"
        :disabled="isFrozen || !canGenerate"
        :aria-busy="isGenerating"
        @click="emit('generateMore')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { useQuasar } from "quasar";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import type { SeedSuggestionItem } from "src/composables/conversation/useSeedSuggestions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ConversationReviewTranslations,
  conversationReviewTranslations,
} from "src/pages/conversation/new/seed/index.i18n";
import { computed } from "vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

defineProps<{
  suggestions: SeedSuggestionItem[];
  /** Shown when the model was not confident enough to make suggestions. */
  tip: string | undefined;
  /** True while the conversation is being sent: no action is possible. */
  isFrozen: boolean;
  /** False once the conversation holds the maximum number of statements. */
  canTakeSuggestion: boolean;
  /** False while a request is running, after a not-confident answer, and above the statement limit. */
  canGenerate: boolean;
  isGenerating: boolean;
  /** "Generate more", or "Generating" with its moving dots while a request is running. */
  generateMoreLabel: string;
}>();

const emit = defineEmits<{
  add: [suggestionId: string];
  discard: [suggestionId: string];
  generateMore: [];
  editConversation: [event: MouseEvent];
}>();

const { t } = useComponentI18n<ConversationReviewTranslations>(
  conversationReviewTranslations
);

const $q = useQuasar();
const backIcon = computed(() =>
  $q.lang.rtl ? "ci:chevron-right" : "ci:chevron-left"
);
</script>

<style scoped lang="scss">
.suggestions-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid $primary-lighter;
  border-radius: 20px;
  background-color: $primary-lightest;
  --suggestions-accent: #{$primary-dark};

  &.is-not-confident {
    border-color: rgba($negative, 0.3);
    background-color: rgba($negative, 0.08);
    --suggestions-accent: #{$negative};
  }
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--suggestions-accent);
}

.suggestions-icon {
  font-size: 1.1rem;
}

.suggestions-title {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
}

.suggestions-note {
  margin: 0;
  color: $color-text-weak;
  font-size: 0.85rem;
  line-height: 1.4;
}

.suggestions-tip,
.suggestion-item {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background-color: $color-background-default;
}

.suggestions-tip-text,
.suggestion-text {
  margin: 0;
  color: $color-text-strong;
  font-size: 0.95rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.box-footer {
  display: flex;
  justify-content: flex-end;
}

.edit-conversation-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid $negative;
  border-radius: 8px;
  color: $negative;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  text-decoration: none;

  &:hover {
    background-color: rgba($negative, 0.08);
  }
}
</style>
