<template>
  <li class="item-row">
    <div class="item-content">
      <ContentTranslationControl
        v-if="translationPreview !== undefined"
        v-model="translationMode"
        :source-language-label="translationPreview.sourceLanguageLabel"
        :translation-status="translationPreview.translationStatus"
      />
      <ZKHtmlContent
        v-if="readableTitle !== ''"
        class="item-title"
        :html-body="displayedTitle"
        :compact-mode="false"
        :enable-links="false"
        content-role="title"
      />
      <p v-else role="status" class="unavailable">
        {{ t("itemUnavailable") }}
      </p>
      <ZKHtmlContent
        v-if="displayedBody"
        :html-body="displayedBody"
        :compact-mode="false"
        :enable-links="true"
        :collapsed-line-count="3"
        :desktop-collapsed-line-count="3"
      />
    </div>
    <div
      class="vote-controls"
      role="group"
      :aria-label="readableTitle || t('itemUnavailable')"
    >
      <q-btn
        flat
        dense
        class="adjust decrease"
        icon="mdi-minus"
        :disable="!canDecrease || !isReadable"
        :aria-label="t('decrease', { title: readableTitle })"
        @click="adjust(-1)"
      />
      <output
        :class="{ support: votes > 0, opposition: votes < 0 }"
        :aria-label="
          t('voteValue', {
            votes: numbers.integer(votes),
            title: readableTitle,
          })
        "
        >{{ numbers.signedInteger(votes) }}</output
      >
      <q-btn
        flat
        dense
        class="adjust increase"
        icon="mdi-plus"
        :disable="!canIncrease || !isReadable"
        :aria-label="t('increase', { title: readableTitle })"
        @click="adjust(1)"
      />
    </div>
    <QvCreditSquare :votes="votes" />
  </li>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useDisplayNumbers } from "src/i18n/numberFormats";
import { htmlToCountedText } from "src/shared/richText";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed } from "vue";

import QvCreditSquare from "./QvCreditSquare.vue";
import { qvVotingTranslations } from "./QvVoting.i18n";
import type { QvItem } from "./QvVoting.types";

const props = defineProps<{
  conversationSlugId: string;
  item: QvItem;
  votes: number;
  canDecrease: boolean;
  canIncrease: boolean;
}>();
const emit = defineEmits<{ adjust: [delta: -1 | 1] }>();
const numbers = useDisplayNumbers();
const { t } = useComponentI18n(qvVotingTranslations);
const {
  displayedTitle,
  displayedBody,
  resolvedDisplayContent,
  translationPreview,
  setTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: () => props.conversationSlugId,
  itemSlugId: () => props.item.slugId,
  displayContent: () => props.item.displayContent,
  // The session refreshes pending translations in one batched snapshot.
  followPendingServerTranslation: false,
});
const readableTitle = computed(() =>
  htmlToCountedText(displayedTitle.value).trim()
);
const isReadable = computed(
  () =>
    resolvedDisplayContent.value?.status === "available" &&
    readableTitle.value !== ""
);
const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});
function adjust(delta: -1 | 1): void {
  if (isReadable.value && (delta === 1 ? props.canIncrease : props.canDecrease))
    emit("adjust", delta);
}
</script>

<style scoped lang="scss">
.item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 9rem 4.5rem;
  gap: 1rem;
  align-items: center;
  padding-block: 1.5rem;
  border-block-start: 1px solid $sky-lighter;
}
.item-content {
  display: grid;
  gap: 0.5rem;
  min-inline-size: 0;
  color: $ink-base;
}
.item-title {
  font-weight: var(--font-weight-semibold);
  color: $ink-dark;
  font-size: 1rem;
  line-height: 1.4;
}
.unavailable {
  margin: 0;
  color: $ink-light;
  font-size: 0.875rem;
}
.vote-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}
.vote-controls output {
  min-inline-size: 2.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-medium);
}
.support {
  color: $green-darkest;
}
.opposition {
  color: $negative;
}
.adjust {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border: 1px solid $sky-lighter;
  border-radius: 8px;
  color: $ink-light;
}
.adjust:focus-visible {
  outline: 2px solid $ink-dark;
  outline-offset: 3px;
}
.increase:hover:not(:disabled),
.increase:focus-visible {
  background: $green-lightest;
  color: $green-darkest;
  border-color: $green-base;
}
.decrease:hover:not(:disabled),
.decrease:focus-visible {
  background: $red-lightest;
  color: $negative;
  border-color: $red-base;
}
@container (max-width: 560px) {
  .item-row {
    grid-template-columns: minmax(0, 1fr) 4.5rem;
  }
  .item-content {
    grid-column: 1 / -1;
  }
  .vote-controls {
    justify-content: flex-start;
  }
}
</style>
