<template>
  <article class="pairwise-card" :class="{ 'is-selected': selected }">
    <ContentTranslationControl
      v-if="translationPreview !== undefined"
      v-model="translationMode"
      class="card-translation-control"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
    />
    <div :id="contentId" class="pairwise-content">
      <p v-if="!hasReadableContent" class="content-unavailable" role="status">
        {{ t("contentUnavailable") }}
      </p>
      <ZKHtmlContent
        class="pairwise-title"
        :html-body="displayedTitle"
        :compact-mode="false"
        :enable-links="false"
        content-role="title"
      />
      <ZKHtmlContent
        v-if="displayedBody"
        class="pairwise-body"
        :html-body="displayedBody"
        :compact-mode="false"
        :enable-links="false"
        :collapsible="false"
      />
    </div>
    <button
      type="button"
      class="pairwise-choice"
      :aria-labelledby="`${contentId} ${choiceId}`"
      :aria-pressed="selected"
      :disabled="disabled || !hasReadableContent"
      @click="emit('choose', item.slugId)"
    >
      <span class="choice-indicator" aria-hidden="true">
        <q-icon v-if="selected" name="check" size="1.25rem" />
      </span>
      <span :id="choiceId">{{ selected ? t("selected") : t("choose") }}</span>
    </button>
    <button
      v-if="item.externalUrl !== null"
      type="button"
      class="card-details"
      @click="emit('details', item.slugId)"
    >
      {{ t("details") }}
    </button>
  </article>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { htmlToCountedText } from "src/shared/richText";
import type { ComparisonCandidateDisplayItem } from "src/utils/comparisonCandidateDisplay";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed, useId, watch } from "vue";

import { pairwiseVotingTranslations } from "./PairwiseVoting.i18n";

const props = defineProps<{
  conversationSlugId: string;
  item: ComparisonCandidateDisplayItem;
  selected: boolean;
  disabled: boolean;
}>();
const emit = defineEmits<{
  choose: [slugId: string];
  details: [slugId: string];
  contentStateChange: [state: PairwiseCandidateState];
}>();
const { t } = useComponentI18n(pairwiseVotingTranslations);
const contentId = useId();
const choiceId = useId();
const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: () => props.conversationSlugId,
  itemSlugId: () => props.item.slugId,
  displayContent: () => props.item.displayContent,
});
const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});
// Detailed responses and long statements need the full reading width. Evaluate
// the displayed translation too, rather than just the original catalog text.
const plainTitle = computed(() =>
  htmlToCountedText(displayedTitle.value).trim()
);
const plainBody = computed(() => htmlToCountedText(displayedBody.value).trim());
const hasReadableContent = computed(
  () => plainTitle.value.length + plainBody.value.length > 0
);
const isLongContent = computed(
  () => plainBody.value.length > 0 || plainTitle.value.length > 280
);

export interface PairwiseCandidateState {
  slugId: string;
  available: boolean;
  isLong: boolean;
}

watch(
  [() => props.item.slugId, hasReadableContent, isLongContent],
  ([slugId, available, isLong]) => {
    emit("contentStateChange", { slugId, available, isLong });
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.pairwise-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 16rem;
  padding: 1.5rem;
  border: 1px solid $sky-lighter;
  border-radius: 12px;
  background: $color-background-default;
  box-shadow: 0 2px 4px rgba($ink-darkest, 0.04);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;

  &.is-selected {
    border-color: $green-darkest;
    background: $green-lightest;
  }
}

.pairwise-content {
  flex: 1;
  min-width: 0;
  padding-block-end: 1.5rem;
  overflow-wrap: anywhere;
}

.pairwise-title {
  display: block;
  color: $ink-base;
  font-size: 1.125rem;
  line-height: 1.55;
}

.pairwise-body {
  display: block;
  margin-block-start: 1rem;
  color: $ink-light;
  font-size: 1rem;
  line-height: 1.6;
}

.content-unavailable {
  color: $ink-light;
  font-size: 0.875rem;
}

.pairwise-choice {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1.5rem 0 0;
  border: 0;
  border-block-start: 1px solid $sky-lighter;
  background: transparent;
  color: $ink-base;
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;

  // Make the card a single native-button target without nesting translation
  // controls, links or rich HTML inside a button.
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 12px;
  }

  &:disabled {
    cursor: default;
  }

  &:focus {
    outline: 2px solid $green-darkest;
    outline-offset: 3px;
  }
}

.choice-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 3rem;
  height: 3rem;
  border: 1px solid $sky-light;
  border-radius: 50%;
  background: $color-background-default;
  color: $green-darkest;
}

.is-selected .choice-indicator {
  border-color: $green-darkest;
  background: $green-lightest;
}

.is-selected .pairwise-choice {
  color: $green-darkest;
}

.card-translation-control,
.card-details {
  position: relative;
  z-index: 1;
  align-self: flex-start;
}

.card-translation-control {
  max-width: 100%;
  margin-block-end: 1rem;
}

.card-details {
  min-height: 44px;
  margin-block-start: 0.5rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: $ink-light;
  font: inherit;
  font-size: 0.875rem;
  text-decoration: underline;
  cursor: pointer;
}

@media (hover: hover) {
  .pairwise-choice:hover:enabled .choice-indicator {
    border-color: $green-darkest;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pairwise-card {
    transition: none;
  }
}
</style>
