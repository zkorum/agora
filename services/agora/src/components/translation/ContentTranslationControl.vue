<template>
  <InlineMetadataLine class="content-translation-control">
    <span v-if="translationStatus === 'pending' || translationStatus === 'running'" class="content-translation-control__label">
      {{ t("translating") }}
    </span>
    <span v-else-if="mode === 'translated' && translationStatus === 'completed'" class="content-translation-control__meta">
      <img src="/images/icons/stars.svg" alt="" class="content-translation-control__icon" />
      <span v-if="translatedLabel !== undefined" class="content-translation-control__label">
        {{ translatedLabel }}
      </span>
    </span>
    <button
      type="button"
      class="content-translation-control__button"
      :disabled="translationStatus === 'pending' || translationStatus === 'running'"
      @click="handleToggleClick"
    >
      {{ toggleLabel }}
    </button>
  </InlineMetadataLine>
</template>

<script setup lang="ts">
import InlineMetadataLine from "src/components/ui-library/InlineMetadataLine.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { LocalizedContentTranslationStatus } from "src/shared/types/zod";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed } from "vue";

import {
  type ContentTranslationControlTranslations,
  contentTranslationControlTranslations,
} from "./ContentTranslationControl.i18n";

const { sourceLanguageLabel, translationStatus } = defineProps<{
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
}>();

const mode = defineModel<ContentTranslationDisplayMode>({ required: true });

const { t } = useComponentI18n<ContentTranslationControlTranslations>(
  contentTranslationControlTranslations
);

const translatedLabel = computed(() => {
  return t("translatedAutomatically");
});

const toggleLabel = computed(() => {
  if (mode.value !== "translated") {
    return t("showTranslation");
  }
  if (sourceLanguageLabel === undefined) {
    return t("showOriginal");
  }
  return t("showOriginalLanguage", { language: sourceLanguageLabel });
});

function toggleMode(): void {
  if (translationStatus === "pending" || translationStatus === "running") {
    return;
  }
  mode.value = mode.value === "translated" ? "original" : "translated";
}

function handleToggleClick(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  toggleMode();
}
</script>

<style scoped lang="scss">
.content-translation-control__icon {
  width: 0.82rem;
  height: 0.82rem;
  flex: 0 0 auto;
  opacity: 0.72;
}

.content-translation-control__meta {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  flex: 0 1 auto;
}

.content-translation-control__label {
  color: $color-text-weak;
  overflow-wrap: anywhere;
}

.content-translation-control__button {
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: $primary;
  font: inherit;
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
  text-align: start;
  cursor: pointer;
}

.content-translation-control {
  max-width: 100%;
  flex-wrap: wrap;
}

.content-translation-control__button:hover {
  text-decoration: underline;
}

.content-translation-control__button:disabled {
  color: $color-text-weak;
  cursor: default;
  opacity: 0.72;
}

.content-translation-control__button:disabled:hover {
  text-decoration: none;
}
</style>
