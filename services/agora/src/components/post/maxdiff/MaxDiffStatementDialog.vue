<template>
  <q-dialog v-model="showDialog">
    <div class="dialog-container">
      <div class="dialog-header">
        <ZKButton
          button-type="icon"
          icon="mdi-close"
          size="1rem"
          @click="showDialog = false"
        />
      </div>
      <div class="dialog-body">
        <ContentTranslationControl
          v-if="translationPreview !== undefined"
          v-model="translationMode"
          class="dialog-translation-control"
          :source-language-label="translationPreview.sourceLanguageLabel"
          :translation-status="translationPreview.translationStatus"
        />
        <ZKHtmlContent
          class="dialog-title-text"
          :html-body="displayedTitle"
          :compact-mode="false"
          :enable-links="false"
          content-role="title"
        />
        <ZKHtmlContent
          v-if="displayedBody"
          :html-body="displayedBody"
          :compact-mode="false"
          :enable-links="true"
        />
        <a
          v-if="safeExternalUrl !== undefined"
          :href="safeExternalUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
        >
          <q-icon name="mdi-github" size="1rem" />
          View on GitHub
        </a>
      </div>
      <div v-if="voteLabel" class="dialog-footer">
        <ZKButton
          button-type="largeButton"
          :flat="voteFlat"
          :outline="!voteFlat"
          :color="voteFlat ? undefined : (voteColor ?? 'primary')"
          :text-color="voteFlat ? 'primary' : undefined"
          :label="voteLabel"
          @click="handleVote"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useRankingItemDisplayContent } from "src/utils/translation/useRankingItemDisplayContent";
import { computed, watch } from "vue";

const props = withDefaults(
  defineProps<{
    conversationSlugId: string;
    itemSlugId: string | undefined;
    externalUrl: string | null;
    displayContent: RankingItemDisplayedContent | undefined;
    voteLabel?: string;
    voteColor?: string;
    voteFlat?: boolean;
    onVote?: () => void;
  }>(),
  {
    voteLabel: undefined,
    voteColor: undefined,
    voteFlat: false,
    onVote: undefined,
  },
);

const showDialog = defineModel<boolean>({ required: true });
const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
  resetTranslationMode,
} = useRankingItemDisplayContent({
  conversationSlugId: computed(() => props.conversationSlugId),
  itemSlugId: computed(() => props.itemSlugId),
  displayContent: computed(() => props.displayContent),
});

const translationMode = computed({
  get: () => translationPreview.value?.mode ?? "original",
  set: setTranslationMode,
});

const safeExternalUrl = computed(() => {
  if (props.externalUrl === null) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(props.externalUrl);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:"
      ? parsedUrl.href
      : undefined;
  } catch {
    return undefined;
  }
});

watch(showDialog, (isOpen) => {
  if (!isOpen) {
    resetTranslationMode();
  }
});

function handleVote(): void {
  props.onVote?.();
  showDialog.value = false;
}
</script>

<style lang="scss" scoped>
.dialog-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 25px;
  width: min(100vw, 30rem);
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1rem 1rem 0 1rem;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  font-size: 1rem;
  line-height: 1.5;
}

.dialog-title-text {
  font-weight: var(--font-weight-semibold);
  font-size: 1.1rem;
  color: $ink-darkest;
}

.dialog-translation-control {
  margin-bottom: 0.25rem;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: $color-text-weak;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.4rem 0;

  &:hover {
    color: $primary;
  }
}

.dialog-footer {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1.5rem 1.5rem 1.5rem;
}
</style>
