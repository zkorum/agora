<template>
  <DynamicProfileImage
    class="preference-avatar"
    :user-identity="owner?.displayName ?? fallbackLabel"
    :organization-image-url="owner?.imageUrl"
    :size="28"
  />
</template>

<script setup lang="ts">
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import type { ConversationEmailUpdatePreferenceAvatar } from "src/shared/types/dto";

defineProps<{
  fallbackLabel: string;
  owner: ConversationEmailUpdatePreferenceAvatar | undefined;
}>();
</script>

<style scoped lang="scss">
.preference-avatar {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  overflow: hidden;
  border-radius: 50%;

  :deep(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
