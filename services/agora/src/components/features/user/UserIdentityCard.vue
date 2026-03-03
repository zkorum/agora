<template>
  <div class="metadata">
    <div>
      <UserAvatar
        v-if="organizationImageUrl == ''"
        :user-identity="userIdentity"
        :size="36"
      />

      <OrganizationImage
        v-if="organizationImageUrl != ''"
        height="36px"
        :organization-image-url="organizationImageUrl"
        :organization-name="userIdentity"
      />
    </div>

    <div class="userNameTimeContainer">
      <div>
        <UserMetadata
          :show-is-guest="false"
          :author-verified="authorVerified"
          :user-identity="userIdentity"
          :show-verified-text="showVerifiedText"
        />
      </div>

      <div :style="{ fontSize: '0.75rem' }" class="timestamp-container">
        {{ useTimeAgo(new Date(createdAt)) }}
        <template v-if="isEdited">
          <span class="bullet">•</span>
          <span>{{ t("edited") }}</span>
        </template>
        <template v-if="participationMode">
          <span class="bullet">•</span>
          <span
            v-if="participationMode === 'guest'"
            :title="t('guestParticipationTooltip')"
          >
            <q-icon name="mdi-account-plus" class="access-icon" />
          </span>
          <span
            v-else-if="participationMode === 'email_verification'"
            :title="t('emailVerificationTooltip')"
          >
            <q-icon name="mdi-email-check" class="access-icon" />
          </span>
          <span
            v-else-if="participationMode === 'strong_verification'"
            :title="t('strongVerificationTooltip')"
          >
            <q-icon name="mdi-shield-check" class="access-icon" />
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";
import UserMetadata from "src/components/features/user/UserMetadata.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ParticipationMode } from "src/shared/types/zod";

import {
  type UserIdentityCardTranslations,
  userIdentityCardTranslations,
} from "./UserIdentityCard.i18n";

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  isEdited: boolean;
  showVerifiedText: boolean;
  organizationImageUrl: string;
  participationMode?: ParticipationMode;
}>();

const { t } = useComponentI18n<UserIdentityCardTranslations>(
  userIdentityCardTranslations
);
</script>

<style lang="scss" scoped>
.userNameTimeContainer {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metadata {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: $color-text-weak;
}

.timestamp-container {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.bullet {
  opacity: 0.6;
}

.access-icon {
  font-size: 0.75rem;
  opacity: 0.8;
}
</style>
