<template>
  <UserAvatar
    v-if="!organizationImageUrl"
    :user-identity="userIdentity"
    :size="size"
  />

  <OrganizationImage
    v-else
    :height="`${size}px`"
    :organization-image-url="organizationImageUrl"
    :organization-name="userIdentity"
  />
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";

defineProps<{
  userIdentity: string;
  size: number;
  organizationImageUrl?: string;
}>();
</script>
