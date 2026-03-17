<template>
  <div class="title-section">
    <div
      v-if="isPrivate"
      class="privacy-label"
    >
      {{ t("privateLabel") }}
    </div>
    <div
      v-if="conversationType === 'maxdiff'"
      class="type-label"
    >
      {{ t("prioritizationLabel") }}
    </div>
    <div
      v-if="externalSourceConfig !== null"
      class="github-label"
    >
      <q-icon name="mdi-github" size="0.75rem" />
      GitHub
    </div>
    <h1 class="conversation-title" :class="`conversation-title--${size}`">
      {{ title }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationType, ExternalSourceConfig } from "src/shared/types/zod";

import {
  type ConversationTitleWithPrivacyLabelTranslations,
  conversationTitleWithPrivacyLabelTranslations,
} from "./ConversationTitleWithPrivacyLabel.i18n";

defineProps<{
  isPrivate: boolean;
  title: string;
  size: "medium" | "large";
  conversationType: ConversationType;
  externalSourceConfig: ExternalSourceConfig | null;
}>();

const { t } = useComponentI18n<ConversationTitleWithPrivacyLabelTranslations>(
  conversationTitleWithPrivacyLabelTranslations,
);
</script>

<style scoped lang="scss">
.title-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.privacy-label,
.type-label,
.github-label {
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: var(--font-weight-semibold);
  display: inline-flex;
  align-items: center;
  letter-spacing: 0.02em;
}

.privacy-label {
  background-color: #333;
}

.type-label {
  background-color: $primary;
}

.github-label {
  background-color: #24292f;
  gap: 0.15rem;
}

.conversation-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: var(--font-weight-medium);
  color: #0a0714;
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
