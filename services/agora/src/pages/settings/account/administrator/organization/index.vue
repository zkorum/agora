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
      <form @submit.prevent="setOrganization()">
        <q-input v-model="username" label="Username" />
        <q-input v-model="description" label="Description" />
        <q-input v-model="imageName" label="Image Name" />
        <q-input v-model="organizationName" label="Organization Name" />
        <q-input v-model="websiteUrl" label="Website URL" />
        <ZKButton
          button-type="largeButton"
          label="Set Organization"
          type="submit"
        />
      </form>

      <ZKButton button-type="largeButton" label="Delete Organization" />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const { setUserOrganization } = useBackendAdministratorOrganizationApi();

const username = ref("");
const description = ref("");
const imageName = ref("");
const organizationName = ref("");
const websiteUrl = ref("");

async function setOrganization() {
  await setUserOrganization(
    username.value,
    description.value,
    imageName.value,
    organizationName.value,
    websiteUrl.value
  );
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
