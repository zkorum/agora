<template>
  <div>
    <ContentTranslationControl
      v-if="translationPreview !== undefined"
      v-model="translationMode"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
    />
    <div role="heading" aria-level="3" class="qv-result-title">
      <ZKHtmlContent
        :html-body="displayedTitle"
        :compact-mode="false"
        :enable-links="false"
        content-role="title"
      />
    </div>
    <ZKHtmlContent
      v-if="displayedBody !== ''"
      :html-body="displayedBody"
      :compact-mode="false"
      :enable-links="true"
      :collapsed-line-count="3"
      :desktop-collapsed-line-count="3"
    />
  </div>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed } from "vue";

const props = defineProps<{
  conversationSlugId: string;
  itemSlugId: string;
  displayContent: RankingItemDisplayedContent;
}>();
const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: () => props.conversationSlugId,
  itemSlugId: () => props.itemSlugId,
  displayContent: () => props.displayContent,
  followPendingServerTranslation: false,
});
const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});
</script>

<style scoped lang="scss">
.qv-result-title {
  font-size: 1rem;
  margin-block-end: 0.5rem;
}
</style>
