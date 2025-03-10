<template>
  <div class="authorContainer">
    <div class="usernameStyle">
      {{ userName }}
    </div>
    <div v-if="authorVerified" class="verifiedMessage">
      <q-icon name="mdi-check-decagram" class="verifiedIconStyle" />
      <div v-if="showVerifiedText">ID verified</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  userName: string;
  authorVerified: boolean;
  showVerifiedText: boolean;
}>();
</script>

<style lang="scss" scoped>
.usernameStyle {
  font-size: 0.875rem;
  font-weight: 500;
  color: #0a0714;
  word-break: break-all;
}

.verifiedMessage {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  font-size: 1rem;
}

.verifiedIconStyle {
  color: #434149;
}

.authorContainer {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.5rem;
}
</style>
