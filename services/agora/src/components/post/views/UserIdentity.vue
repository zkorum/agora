<template>
  <div class="metadata">
    <div>
      <UserAvatar :user-name="username" :size="36" />
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

defineProps<{
  username: string;
  authorVerified: boolean;
  createdAt: Date;
  showVerifiedText: boolean;
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
