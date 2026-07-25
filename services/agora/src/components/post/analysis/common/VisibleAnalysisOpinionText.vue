<template>
  <ContentTranslationControl
    v-if="translationInteractive && translationPreview !== undefined"
    :model-value="translationPreview.mode"
    class="content-translation-interaction"
    :source-language-label="translationPreview.sourceLanguageLabel"
    :translation-status="translationPreview.translationStatus"
    @update:model-value="setTranslationMode"
  />
  <ZKHtmlContent
    :html-body="renderedOpinion"
    :compact-mode="compactMode"
    :enable-links="enableLinks"
  />
  <CommentModeration
    v-if="showModerationWarning && isMovedToModerationHistory"
    :moderation="content.moderation"
    :opinion-slug-id="opinionSlugId"
    :post-slug-id="postSlugId"
    :conversation-author-username="conversationAuthorUsername"
    :conversation-organization-name="conversationOrganizationName"
  />
</template>

<script setup lang="ts">
import CommentModeration from "src/components/post/comments/group/item/CommentModeration.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type { AnalysisOpinionItem } from "src/shared/types/zod";
import {
  type OpinionItemDisplayContentInput,
  useOpinionItemDisplayContent,
} from "src/utils/translation/useOpinionItemDisplayContent";
import { computed, ref, watch } from "vue";

type VisibleAnalysisOpinionContent = Extract<
  AnalysisOpinionItem["content"],
  { status: "visible" }
>;

const props = defineProps<{
  content: VisibleAnalysisOpinionContent;
  opinionSlugId: string;
  compactMode: boolean;
  enableLinks: boolean;
  showModerationWarning: boolean;
  translationInteractive: boolean;
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
}>();

const displayableOpinion = computed<OpinionItemDisplayContentInput>(() => ({
  opinionSlugId: props.opinionSlugId,
  opinion: props.content.html,
  sourceLanguageCode: props.content.sourceLanguageCode,
  displayContent: props.content.displayContent,
}));
const { displayedOpinion, translationPreview, setTranslationMode } =
  useOpinionItemDisplayContent({
    conversationSlugId: computed(() => props.postSlugId),
    opinionItem: displayableOpinion,
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
const isMovedToModerationHistory = computed(
  () =>
    props.content.moderation.status === "moderated" &&
    props.content.moderation.action === "move"
);
</script>
