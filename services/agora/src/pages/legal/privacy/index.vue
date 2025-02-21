<template>
  <DrawerLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasCloseButton: false,
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
  </DrawerLayout>
</template>

<script setup lang="ts">
import ZKTitleBodyWrapper from "src/components/ui-library/ZKTitleBodyWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
</script>

<style scoped lang="scss"></style>
