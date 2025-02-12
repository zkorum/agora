<template>
  <div class="metadata">
    <div>
      <UserAvatar :user-name="userName" :size="30" class="avatarIcon" />
    </div>

    <div class="userNameTimeContainer">
      <div class="authorContainer">
        <div class="usernameStyle">
          {{ userName }}
        </div>
        <div v-if="authorVerified" class="verifiedMessage">
          <q-icon name="mdi-check-decagram" class="verifiedIconStyle" />
          <div>ID verified</div>
        </div>
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

defineProps<{
  userName: string;
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

.authorContainer {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.5rem;
}

.usernameStyle {
  word-break: break-all;
}

.verifiedMessage {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.verifiedIconStyle {
  color: $verified-icon-color;
  font-size: 1rem;
}

.metadata {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
  color: $color-text-weak;
  padding-bottom: 1rem;
}
</style>
