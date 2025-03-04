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
        :fixed-height="true"
      >
        <template #middle> Profile Settings </template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <ZKCard padding="1rem" class="cardBackground">
        <div class="titleStyle">Change username</div>

        <UsernameChange :show-submit-button="true" />
      </ZKCard>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import UsernameChange from "src/components/account/UsernameChange.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
</script>

<style scoped lang="scss">
.titleStyle {
  font-size: 1.1rem;
  font-weight: 500;
  padding-bottom: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

.cardBackground {
  background-color: white;
}
</style>
