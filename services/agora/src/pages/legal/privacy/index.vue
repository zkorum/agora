<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasSettingsButton: false,
      hasCloseButton: true,
      hasLoginButton: true,
    }"
  >
    <ZKTitleBodyWrapper title="Privacy Policy">
      To be added
    </ZKTitleBodyWrapper>
  </MainLayout>
</template>

<script setup lang="ts">
import ZKTitleBodyWrapper from "src/components/ui-library/ZKTitleBodyWrapper.vue";
import MainLayout from "src/layouts/MainLayout.vue";
</script>

<style scoped lang="scss"></style>
