<template>
  <form class="container" @submit.prevent="setOrganization()">
    <q-input
      v-model="organizationName"
      label="Name"
      autocomplete="off"
      data-1p-ignore
    />
    <q-input v-model="description" label="Description" />
    <q-input v-model="imagePath" label="Image Path (file name or https path)" />
    <div>File name: avatar_default_0.png</div>
    <div>Full path: https://agoracitizen.network/images/big_logo_agora.png</div>
    <q-input v-model="websiteUrl" label="Website URL" />
    <ZKButton
      button-type="largeButton"
      label="Add Organization"
      type="submit"
    />
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const { createOrganization } = useBackendAdministratorOrganizationApi();

const description = ref("");
const imagePath = ref("");
const organizationName = ref("");
const websiteUrl = ref("");

function isHttpsUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch (error) {
    return false;
  }
}

async function setOrganization() {
  await createOrganization(
    description.value,
    imagePath.value,
    isHttpsUrl(imagePath.value),
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
