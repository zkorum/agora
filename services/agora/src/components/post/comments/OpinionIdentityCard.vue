<template>
  <div v-if="isSeed" class="seed-identity-container">
    <UserAvatar :user-identity="'seed'" :size="36" />
    <div class="seed-label">{{ t("seedOpinion") }}</div>
  </div>
  <UserIdentityCard
    v-else
    :author-verified="authorVerified"
    :created-at="createdAt"
    :user-identity="userIdentity"
    :show-verified-text="showVerifiedText"
    :organization-image-url="organizationImageUrl"
  />
</template>

<script setup lang="ts">
import UserAvatar from "src/components/account/UserAvatar.vue";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  opinionIdentityCardTranslations,
  type OpinionIdentityCardTranslations,
} from "./OpinionIdentityCard.i18n";

const { t } = useComponentI18n<OpinionIdentityCardTranslations>(
  opinionIdentityCardTranslations
);

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
  organizationImageUrl: string;
  isSeed: boolean;
}>();
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
  font-weight: 500;
}
</style>
