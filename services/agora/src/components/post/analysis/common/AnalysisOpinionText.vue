<template>
  <div class="analysis-opinion-text">
    <span v-if="redactedPlaceholder !== undefined" class="redacted-placeholder">
      {{ redactedPlaceholder }}
    </span>
    <VisibleAnalysisOpinionText
      v-if="visibleContent !== undefined"
      :content="visibleContent"
      :opinion-slug-id="opinionItem.opinionSlugId"
      :compact-mode="compactMode"
      :enable-links="enableLinks"
      :show-moderation-warning="showModerationWarning"
      :translation-interactive="translationInteractive"
      :post-slug-id="postSlugId"
      :conversation-author-username="conversationAuthorUsername"
      :conversation-organization-name="conversationOrganizationName"
    />
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AnalysisOpinionItem } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type AnalysisOpinionTextTranslations,
  analysisOpinionTextTranslations,
} from "./AnalysisOpinionText.i18n";
import VisibleAnalysisOpinionText from "./VisibleAnalysisOpinionText.vue";

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
const visibleContent = computed(() =>
  props.opinionItem.content.status === "visible"
    ? props.opinionItem.content
    : undefined
);

const redactedPlaceholder = computed(() => {
  const content = props.opinionItem.content;
  if (content.status === "visible") {
    return undefined;
  }
  return content.reason === "statement_deleted"
    ? t("deletedStatement")
    : t("moderatedStatement");
});
</script>

<style scoped lang="scss">
.analysis-opinion-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.redacted-placeholder {
  color: #6d6a74;
  font-style: italic;
}
</style>
