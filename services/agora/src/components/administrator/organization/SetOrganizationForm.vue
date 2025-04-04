<template>
  <form class="container" @submit.prevent="setOrganization()">
    <q-input
      v-model="username"
      label="Username"
      autocomplete="off"
      data-1p-ignore
    />
    <q-input v-model="description" label="Description" />
    <q-input v-model="imageName" label="Image Name" />
    <q-input
      v-model="organizationName"
      label="Name"
      autocomplete="off"
      data-1p-ignore
    />
    <q-input v-model="websiteUrl" label="Website URL" />
    <ZKButton
      button-type="largeButton"
      label="Set Organization"
      type="submit"
    />
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const { setUserOrganization } = useBackendAdministratorOrganizationApi();

const username = ref("");
const description = ref("");
const imageName = ref("default_company_logo.svg");
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

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
