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
        :height="'36px'"
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

      <div :style="{ fontSize: '0.75rem' }">
        {{ useTimeAgo(new Date(createdAt)) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
import UserAvatar from "src/components/account/UserAvatar.vue";
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import UserMetadata from "../views/UserMetadata.vue";

defineProps<{
  userIdentity: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
  organizationImageUrl: string;
}>();
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
</style>
