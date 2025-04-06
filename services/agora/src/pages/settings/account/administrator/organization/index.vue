<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
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
        <template #middle> Administrator</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <ZKCard :padding="'1rem'" class="cardBackground">
        <SetOrganizationForm />
      </ZKCard>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import SetOrganizationForm from "src/components/administrator/organization/SetOrganizationForm.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 1rem;
}

.cardBackground {
  background-color: white;
}
</style>
