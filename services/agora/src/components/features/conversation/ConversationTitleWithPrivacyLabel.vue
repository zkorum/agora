<template>
  <div class="title-section">
    <div
      v-if="isPrivate"
      class="privacy-label"
      :class="`privacy-label--${size}`"
    >
      {{ t("privateLabel") }}
    </div>
    <h1 class="conversation-title" :class="`conversation-title--${size}`">
      {{ title }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  conversationTitleWithPrivacyLabelTranslations,
  type ConversationTitleWithPrivacyLabelTranslations,
} from "./ConversationTitleWithPrivacyLabel.i18n";

interface Props {
  isPrivate: boolean; // Meaning the conversation is not indexed
  title: string;
  size: "medium" | "large";
}

defineProps<Props>();

const { t } = useComponentI18n<ConversationTitleWithPrivacyLabelTranslations>(
  conversationTitleWithPrivacyLabelTranslations
);
</script>

<style scoped lang="scss">
.title-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.privacy-label {
  background-color: #333;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.3rem;
}

.conversation-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: #0a0714;
  line-height: 1.3;
}

.conversation-title--medium {
  font-size: 1.2rem;
}

.conversation-title--large {
  font-size: 1.5rem;
}

.privacy-label--medium {
  font-size: 0.8rem;
}

.privacy-label--large {
  font-size: 0.9rem;
}
</style>
