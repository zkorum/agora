<template>
  <div class="candidate-card-content">
    <ContentTranslationControl
      v-if="translationPreview !== undefined"
      v-model="translationMode"
      class="candidate-card-translation-control"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
      @click.stop
      @keydown.stop
      @mousedown.stop
      @pointerdown.stop
    />

    <div ref="contentElement" class="candidate-content-wrapper">
      <ZKHtmlContent
        :html-body="displayedTitle"
        :compact-mode="false"
        :enable-links="false"
        content-role="title"
      />
      <span v-if="displayedBody" class="candidate-body-inline">
        — {{ htmlToCountedText(displayedBody) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { htmlToCountedText } from "src/shared/shared";
import type { MaxDiffCandidateDisplayItem } from "src/utils/maxdiffCandidateDisplay";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed, nextTick, useTemplateRef, watch } from "vue";

const props = defineProps<{
  conversationSlugId: string;
  item: MaxDiffCandidateDisplayItem;
}>();

const emit = defineEmits<{
  contentChanged: [];
}>();

const contentElement = useTemplateRef<HTMLElement>("contentElement");

const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: computed(() => props.conversationSlugId),
  itemSlugId: computed(() => props.item.slugId),
  displayContent: computed(() => props.item.displayContent),
});

const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});

function isTruncated(): boolean {
  const element = contentElement.value;
  if (element === null) {
    return false;
  }

  return element.scrollHeight > element.clientHeight + 1;
}

watch([displayedTitle, displayedBody], () => {
  void nextTick(() => {
    emit("contentChanged");
  });
});

defineExpose({ isTruncated });
</script>

<style scoped lang="scss">
.candidate-card-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
}

.candidate-card-translation-control {
  max-width: 100%;
  align-self: flex-start;
}

.candidate-content-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
}

.candidate-body-inline {
  font-size: 0.85em;
  color: $color-text-weak;
}
</style>
