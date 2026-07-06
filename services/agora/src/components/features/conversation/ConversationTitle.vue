<template>
  <div class="title-section">
    <ConversationChip
      v-if="showChips && isPrivate"
      :label="t('privateLabel')"
      background-color="#333"
    />
    <ConversationChip
      v-if="showChips && isMaxDiffConversation"
      :label="t('prioritizationLabel')"
      background-color="var(--q-primary)"
      icon="mdi-sort-numeric-ascending"
    />
    <ConversationChip
      v-if="showChips && externalSourceConfig !== null"
      label="GitHub"
      background-color="#24292f"
      icon="mdi-github"
    />
    <ConversationProjectContextPill
      v-if="showChips && projectContext !== undefined"
      :project-slug="projectContext.projectSlug"
      :project-title="displayedProjectTitle"
      :conversation-slug-id="projectContext.conversationSlugId"
    />
    <h1 class="conversation-title" :class="`conversation-title--${size}`">
      {{ title }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationProjectContext,
  ConversationTypeConfig,
  ExternalSourceConfig,
} from "src/shared/types/zod";
import { getConversationProjectContextTitle } from "src/utils/project/conversationProjectContext";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed } from "vue";

import ConversationChip from "./ConversationChip.vue";
import ConversationProjectContextPill from "./ConversationProjectContextPill.vue";
import {
  type ConversationTitleTranslations,
  conversationTitleTranslations,
} from "./ConversationTitle.i18n";

const props = withDefaults(defineProps<{
  isPrivate: boolean;
  title: string;
  size: "medium" | "large";
  conversationTypeConfig: ConversationTypeConfig;
  externalSourceConfig: ExternalSourceConfig | null;
  projectContext: ConversationProjectContext | undefined;
  projectContextTitleMode: ContentTranslationDisplayMode;
  showChips?: boolean;
}>(), {
  showChips: true,
});

const { t } = useComponentI18n<ConversationTitleTranslations>(
  conversationTitleTranslations,
);
const isMaxDiffConversation = computed(
  () =>
    props.conversationTypeConfig.conversationType === "ranking" &&
    props.conversationTypeConfig.rankingMode === "maxdiff"
);
const displayedProjectTitle = computed(() => {
  const projectContext = props.projectContext;
  if (projectContext === undefined) {
    return "";
  }

  return getConversationProjectContextTitle({
    projectContext,
    titleMode: props.projectContextTitleMode,
  });
});
</script>

<style scoped lang="scss">
.title-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.conversation-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: var(--font-weight-medium);
  color: $ink-darkest;
  line-height: 1.3;
  min-width: 0;
  max-width: 100%;
}

.conversation-title--medium {
  font-size: 1.2rem;
}

.conversation-title--large {
  font-size: 1.5rem;
}
</style>
