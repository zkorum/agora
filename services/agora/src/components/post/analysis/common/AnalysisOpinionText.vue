<template>
  <div class="analysis-opinion-text">
    <span v-if="isHiddenModerated" class="moderated-placeholder">
      {{ t("hiddenModeratedStatement") }}
    </span>
    <ZKHtmlContent
      v-else
      :html-body="opinionItem.opinion"
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
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem } from "src/shared/types/zod";
import { computed } from "vue";

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
    postSlugId?: string;
    conversationAuthorUsername?: string;
    conversationOrganizationName?: string;
  }>(),
  {
    compactMode: false,
    enableLinks: false,
    showModerationWarning: true,
    postSlugId: "",
    conversationAuthorUsername: "",
    conversationOrganizationName: "",
  }
);

const { t } = useComponentI18n<AnalysisOpinionTextTranslations>(
  analysisOpinionTextTranslations
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
