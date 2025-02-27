<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
      >
        <template #middle> Profile Settings </template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="titleStyle">Change username</div>

      <UsernameChange :show-submit-button="true" />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import UsernameChange from "src/components/account/UsernameChange.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
</script>

<style scoped lang="scss">
.titleStyle {
  font-size: 1.1rem;
  font-weight: 500;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}
</style>
