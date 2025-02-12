<template>
  <div class="metadata">
    <div>
      <UserAvatar :user-name="username" :size="30" class="avatarIcon" />
    </div>

    <div class="userNameTimeContainer">
      <div>
        <Username :author-verified="authorVerified" :user-name="username" />
      </div>

      <div>
        {{ formatTimeAgo(new Date(createdAt)) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTimeAgo } from "@vueuse/core";
import UserAvatar from "src/components/account/UserAvatar.vue";
import Username from "./Username.vue";

defineProps<{
  username: string;
  authorVerified: boolean;
  createdAt: Date;
}>();
</script>

<style lang="scss" scoped>
.userNameTimeContainer {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
}

.metadata {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
  color: $color-text-weak;
}
</style>
