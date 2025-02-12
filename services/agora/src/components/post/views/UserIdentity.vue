<template>
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
</template>

<script setup lang="ts">
import { formatTimeAgo } from "@vueuse/core";

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
</style>
