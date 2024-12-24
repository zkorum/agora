<template>
  <div class="container">
    <div class="titleStyle">Profile Settings</div>

    <div class="subtitleStyle">Change username</div>

    <UsernameChange :show-submit-button="true" />
  </div>
</template>

<script setup lang="ts">
import UsernameChange from "src/components/account/UsernameChange.vue";
</script>

<style scoped lang="scss">
.titleStyle {
  font-size: 1.4rem;
  font-weight: bold;
}

.subtitleStyle {
  font-size: 1.1rem;
  font-weight: bold;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
