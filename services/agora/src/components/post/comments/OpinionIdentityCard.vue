<template>
  <div v-if="isSeed" class="seed-identity-container">
    <UserAvatar user-identity="seed" :size="36" />
    <div class="seed-label">{{ t("seedOpinion") }}</div>
  </div>
  <UserIdentityCard
    v-else
    :author-verified="authorVerified"
    :created-at="createdAt"
    :updated-at="updatedAt"
    :user-identity="userIdentity"
    :show-verified-text="showVerifiedText"
    :organization-image-url="organizationImageUrl"
  />
</template>

<script setup lang="ts">
import UserAvatar from "src/components/account/UserAvatar.vue";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type OpinionIdentityCardTranslations,
  opinionIdentityCardTranslations,
} from "./OpinionIdentityCard.i18n";

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  showVerifiedText: boolean;
  organizationImageUrl: string;
  isSeed: boolean;
}>();

const { t } = useComponentI18n<OpinionIdentityCardTranslations>(
  opinionIdentityCardTranslations
);
</script>

<style lang="scss" scoped>
.seed-identity-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: $color-text-weak;
}

.seed-label {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
}
</style>
