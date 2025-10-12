<template>
  <div class="conversation-info-card">
    <router-link
      :to="{
        name: '/conversation/[postSlugId]',
        params: { postSlugId: conversationData.metadata.conversationSlugId },
      }"
      class="card-link"
    >
      <div class="header-section">
        <UserIdentityCard
          :author-verified="false"
          :created-at="conversationData.metadata.createdAt"
          :user-identity="
            conversationData.metadata.organization?.name ||
            conversationData.metadata.authorUsername
          "
          :show-verified-text="false"
          :organization-image-url="
            conversationData.metadata.organization?.imageUrl || ''
          "
        />
      </div>

      <div class="title-section">
        <ConversationTitleWithPrivacyLabel
          :is-private="!conversationData.metadata.isIndexed"
          :title="conversationData.payload.title"
          size="medium"
        />
      </div>

      <div class="stats-section">
        <div class="stat-item">
          <i class="mdi mdi-comment-outline stat-icon"></i>
          <span class="stat-value">{{
            conversationData.metadata.opinionCount
          }}</span>
          <span class="stat-label">{{ t("opinions") }}</span>
        </div>

        <div class="stat-item">
          <i class="mdi mdi-account-outline stat-icon"></i>
          <span class="stat-value">{{
            conversationData.metadata.participantCount
          }}</span>
          <span class="stat-label">{{ t("participants") }}</span>
        </div>

        <div class="stat-item">
          <i class="mdi mdi-thumb-up-outline stat-icon"></i>
          <span class="stat-value">{{
            conversationData.metadata.voteCount
          }}</span>
          <span class="stat-label">{{ t("votes") }}</span>
        </div>
      </div>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import ConversationTitleWithPrivacyLabel from "src/components/features/conversation/ConversationTitleWithPrivacyLabel.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  conversationInfoCardTranslations,
  type ConversationInfoCardTranslations,
} from "./ConversationInfoCard.i18n";

defineProps<{
  conversationData: ExtendedConversation;
}>();

const { t } = useComponentI18n<ConversationInfoCardTranslations>(
  conversationInfoCardTranslations
);
</script>

<style scoped lang="scss">
.conversation-info-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.card-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-section {
  display: flex;
  align-items: center;
}

.title-section {
  margin-top: 0.25rem;
}

.stats-section {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: $color-text-weak;
  font-size: 0.875rem;
}

.stat-icon {
  font-size: 1.125rem;
}

.stat-value {
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.stat-label {
  @media (max-width: 768px) {
    display: none;
  }
}
</style>
