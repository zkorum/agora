<template>
  <div class="analysis-opinion-text">
    <span v-if="isHiddenModerated" class="moderated-placeholder">
      {{ t("hiddenModeratedStatement") }}
    </span>
    <ContentTranslationControl
      v-if="
        !isHiddenModerated &&
        translationInteractive &&
        translationPreview !== undefined
      "
      :model-value="translationPreview.mode"
      class="content-translation-interaction"
      :source-language-label="translationPreview.sourceLanguageLabel"
      :translation-status="translationPreview.translationStatus"
      @update:model-value="setTranslationMode"
    />
    <ZKHtmlContent
      v-if="!isHiddenModerated"
      :html-body="renderedOpinion"
      :compact-mode="compactMode"
      :enable-links="enableLinks"
    />
    <CommentModeration
      v-if="showModerationWarning && isMovedToModerationHistory"
      :comment-item="opinionItem"
      :post-slug-id="postSlugId"
      :conversation-author-username="conversationAuthorUsername"
      :conversation-organization-name="conversationOrganizationName"
    />
  </div>
</template>

<script setup lang="ts">
import CommentModeration from "src/components/post/comments/group/item/CommentModeration.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem } from "src/shared/types/zod";
import { useOpinionItemDisplayContent } from "src/utils/translation/useOpinionItemDisplayContent";
import { computed, ref, watch } from "vue";

import {
  type AnalysisOpinionTextTranslations,
  analysisOpinionTextTranslations,
} from "./AnalysisOpinionText.i18n";

const props = withDefaults(
  defineProps<{
    opinionItem: AnalysisOpinionItem;
    compactMode?: boolean;
    enableLinks?: boolean;
    showModerationWarning?: boolean;
    translationInteractive?: boolean;
    postSlugId: string;
    conversationAuthorUsername?: string;
    conversationOrganizationName?: string;
  }>(),
  {
    compactMode: false,
    enableLinks: false,
    showModerationWarning: true,
    translationInteractive: true,
    conversationAuthorUsername: "",
    conversationOrganizationName: "",
  }
);

const { t } = useComponentI18n<AnalysisOpinionTextTranslations>(
  analysisOpinionTextTranslations
);
const { displayedOpinion, translationPreview, setTranslationMode } =
  useOpinionItemDisplayContent({
    conversationSlugId: computed(() => props.postSlugId),
    opinionItem: computed(() => props.opinionItem),
  });
const frozenOpinion = ref<string>();
watch(
  () => props.translationInteractive,
  (isInteractive) => {
    frozenOpinion.value = isInteractive ? undefined : displayedOpinion.value;
  },
  { flush: "sync", immediate: true }
);
const renderedOpinion = computed(
  () => frozenOpinion.value ?? displayedOpinion.value
);

const isHiddenModerated = computed(
  () =>
    props.opinionItem.moderation.status === "moderated" &&
    props.opinionItem.moderation.action === "hide"
);

const isMovedToModerationHistory = computed(
  () =>
    props.opinionItem.moderation.status === "moderated" &&
    props.opinionItem.moderation.action === "move"
);
</script>

<style scoped lang="scss">
.analysis-opinion-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.moderated-placeholder {
  color: #6d6a74;
  font-style: italic;
}
</style>
