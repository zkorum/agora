<template>
  <div class="metadata">
    <div>
      <UserAvatar
        v-if="organizationUrl == ''"
        :user-name="username"
        :size="36"
      />

      <OrganizationImage
        v-if="organizationUrl != ''"
        :height="'36px'"
        :organization-image-url="organizationUrl"
        :organization-name="organizationName"
      />
    </div>

    <div class="userNameTimeContainer">
      <div>
        <Username
          :author-verified="authorVerified"
          :user-name="username"
          :show-verified-text="showVerifiedText"
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
import Username from "./Username.vue";
import OrganizationImage from "src/components/account/OrganizationImage.vue";

defineProps<{
  username: string;
  organizationName: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
  organizationUrl: string;
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
