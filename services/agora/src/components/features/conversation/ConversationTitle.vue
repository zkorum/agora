<template>
  <div class="title-section">
    <div v-if="showProjectContextRow" class="conversation-context-row">
      <ConversationProjectContextPill
        v-if="projectContext !== undefined"
        :project-slug="projectContext.projectSlug"
        :project-title="displayedProjectTitle"
        :conversation-slug-id="projectContext.conversationSlugId"
        :interactive="projectContextInteractive"
      />
    </div>
    <div class="conversation-title-row">
      <ConversationChip
        v-for="chip in inlineConversationChips"
        :key="chip.label"
        :label="chip.label"
        :background-color="chip.backgroundColor"
        :icon="chip.icon"
      />
      <h1 class="conversation-title" :class="`conversation-title--${size}`">
        {{ title }}
      </h1>
    </div>
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

interface ConversationTitleChip {
  label: string;
  backgroundColor: string;
  icon: string | undefined;
}

const props = withDefaults(defineProps<{
  isPrivate: boolean;
  title: string;
  size: "medium" | "large";
  conversationTypeConfig: ConversationTypeConfig;
  externalSourceConfig: ExternalSourceConfig | null;
  projectContext: ConversationProjectContext | undefined;
  projectContextTitleMode: ContentTranslationDisplayMode;
  projectContextInteractive?: boolean;
  showChips?: boolean;
}>(), {
  projectContextInteractive: true,
  showChips: true,
});

const { t } = useComponentI18n<ConversationTitleTranslations>(
  conversationTitleTranslations,
);
const isMaxDiffConversation = computed(
  () =>
    props.conversationTypeConfig.conversationType === "ranking" &&
    props.conversationTypeConfig.rankingMode === "bws"
);
const showProjectContextRow = computed(
  () => props.showChips && props.projectContext !== undefined
);
const conversationChips = computed<ConversationTitleChip[]>(() => {
  if (!props.showChips) {
    return [];
  }

  const chips: ConversationTitleChip[] = [];

  if (props.isPrivate) {
    chips.push({
      label: t("privateLabel"),
      backgroundColor: "#333",
      icon: undefined,
    });
  }

  if (isMaxDiffConversation.value) {
    chips.push({
      label: t("prioritizationLabel"),
      backgroundColor: "var(--q-primary)",
      icon: "mdi-sort-numeric-ascending",
    });
  }

  if (props.externalSourceConfig !== null) {
    chips.push({
      label: "GitHub",
      backgroundColor: "#24292f",
      icon: "mdi-github",
    });
  }

  return chips;
});
const inlineConversationChips = computed(() =>
  conversationChips.value
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
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
}

.conversation-context-row,
.conversation-title-row {
  display: flex;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.conversation-context-row {
  line-height: 1.2;
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
