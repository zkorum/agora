<template>
  <div class="item-list-content">
    <ContentTranslationControl
      v-if="translationPreview !== undefined"
      v-model="translationMode"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
    />
    <ZKHtmlContent
      :html-body="displayedTitle"
      :compact-mode="compactMode"
      :enable-links="false"
      content-role="title"
    />
  </div>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed, watch } from "vue";

export interface MaxDiffItemListDisplayState {
  itemSlugId: string;
  sourceVersion: string;
  title: string;
  body: string | null;
  displayContent: RankingItemDisplayedContent | undefined;
}

const props = defineProps<{
  conversationSlugId: string;
  itemSlugId: string;
  displayContent: RankingItemDisplayedContent;
  compactMode: boolean;
}>();

const emit = defineEmits<{
  displayStateChanged: [state: MaxDiffItemListDisplayState];
}>();

const {
  displayedTitle,
  displayedBody,
  resolvedDisplayContent,
  translationPreview,
  setTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: computed(() => props.conversationSlugId),
  itemSlugId: computed(() => props.itemSlugId),
  displayContent: computed(() => props.displayContent),
});
const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});

watch(
  [displayedTitle, displayedBody, resolvedDisplayContent],
  ([title, body, activeDisplayContent]) => {
    emit("displayStateChanged", {
      itemSlugId: props.itemSlugId,
      sourceVersion: props.displayContent.sourceVersion,
      title,
      body: body === "" ? null : body,
      displayContent: activeDisplayContent,
    });
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.item-list-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
</style>
