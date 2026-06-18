<template>
  <div class="content-translation-control">
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
      {{ mode === "translated" ? t("showOriginal") : t("showTranslation") }}
    </button>
  </div>
</template>

<script setup lang="ts">
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
  if (sourceLanguageLabel === undefined) {
    return undefined;
  }
  return t("translatedFrom", { language: sourceLanguageLabel });
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
.content-translation-control {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  color: $color-text-weak;
  font-size: 0.75rem;
  line-height: 1.2;
}

.content-translation-control__icon {
  width: 0.88rem;
  height: 0.88rem;
  flex: 0 0 auto;
  opacity: 0.72;
}

.content-translation-control__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.content-translation-control__label {
  color: $color-text-weak;
}

.content-translation-control__button {
  padding: 0;
  border: 0;
  background: transparent;
  color: $primary;
  font: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
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
