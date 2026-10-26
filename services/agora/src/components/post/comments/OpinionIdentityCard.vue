<template>
  <div v-if="isSeed" class="seed-identity-container">
    <UserAvatar user-identity="seed" :size="36" />
    <InlineMetadataLine class="seed-metadata">
      <span class="seed-label">{{ t("seedOpinion") }}</span>
      <template v-if="isEdited">
        <span class="seed-separator" aria-hidden="true" />
        <span>{{ identityT("edited") }}</span>
      </template>
    </InlineMetadataLine>
  </div>
  <UserIdentityCard
    v-else
    :author-verified="authorVerified"
    :created-at="createdAt"
    :is-edited="isEdited"
    :user-identity="userIdentity"
    :show-verified-text="showVerifiedText"
    :organization-image-url="organizationImageUrl"
    :show-avatar-fallback="true"
  />
</template>

<script setup lang="ts">
import UserAvatar from "src/components/account/UserAvatar.vue";
import { userIdentityCardTranslations } from "src/components/features/user/UserIdentityCard.i18n";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import InlineMetadataLine from "src/components/ui-library/InlineMetadataLine.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type OpinionIdentityCardTranslations,
  opinionIdentityCardTranslations,
} from "./OpinionIdentityCard.i18n";

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
  organizationImageUrl: string;
  isSeed: boolean;
  isEdited: boolean;
}>();

const { t } = useComponentI18n<OpinionIdentityCardTranslations>(
  opinionIdentityCardTranslations
);
const { t: identityT } = useComponentI18n(userIdentityCardTranslations);
</script>

<style lang="scss" scoped>
.seed-identity-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: $color-text-weak;
}

.seed-metadata {
  font-size: 0.875rem;
}

.seed-label {
  font-weight: var(--font-weight-medium);
}

.seed-separator {
  flex-shrink: 0;
  inline-size: 0.1875rem;
  block-size: 0.1875rem;
  border-radius: 50%;
  background-color: currentColor;
  opacity: 0.6;
}
</style>
