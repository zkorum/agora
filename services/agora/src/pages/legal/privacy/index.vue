<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasCloseButton: true,
      hasLoginButton: false,
    }"
  >
    <ZKTitleBodyWrapper title="Privacy Policy">
      Refer to
      <a
        href="https://zkorum.notion.site/Privacy-Policy-ac5d0d7c91f142e481daa8f826b0e2b2"
        rel="noopener noreferrer"
        target="_blank"
        >this external page (WIP)</a
      >
    </ZKTitleBodyWrapper>
  </MainLayout>
</template>

<script setup lang="ts">
import ZKTitleBodyWrapper from "src/components/ui-library/ZKTitleBodyWrapper.vue";
import MainLayout from "src/layouts/MainLayout.vue";
</script>

<style scoped lang="scss"></style>
