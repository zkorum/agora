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
          :user-type="organizationImageUrl != '' ? 'organization' : 'normal'"
        />
      </div>

      <div :style="{ fontSize: '0.75rem' }" class="timestamp-container">
        {{ useTimeAgo(new Date(createdAt)) }}
        <template v-if="isGuestParticipationAllowed === true">
          <span class="bullet">•</span>
          <i
            class="pi pi-user-plus access-icon"
            :title="t('guestParticipationTooltip')"
          ></i>
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

import {
  type UserIdentityCardTranslations,
  userIdentityCardTranslations,
} from "./UserIdentityCard.i18n";

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
  organizationImageUrl: string;
  isGuestParticipationAllowed?: boolean;
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
