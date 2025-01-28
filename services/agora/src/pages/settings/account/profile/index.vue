<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasSettingsButton: true,
      hasCloseButton: false,
      hasLoginButton: true,
    }"
  >
    <div class="container">
      <div class="titleStyle">Profile Settings</div>

      <div class="subtitleStyle">Change username</div>

      <UsernameChange :show-submit-button="true" />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import UsernameChange from "src/components/account/UsernameChange.vue";
import MainLayout from "src/layouts/MainLayout.vue";
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
