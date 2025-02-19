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
      hasLoginButton: true,
    }"
  >
    <ZKTitleBodyWrapper title="Terms of Service">
      Refer to
      <a
        href="https://zkorum.notion.site/Terms-of-Service-c37b34e934c240878b7d5af53888e72c"
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
