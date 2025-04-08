<template>
  <form class="container" @submit.prevent="setOrganization()">
    <q-input
      v-model="organizationName"
      label="Name"
      autocomplete="off"
      data-1p-ignore
    />
    <q-input v-model="description" label="Description" />
    <q-input
      v-model="imagePath"
      label="Image Path (file name only if using S3)"
    />
    <div>Non-full path: avatar_default_0.png</div>
    <div>Full path: https://agoracitizen.network/images/big_logo_agora.png</div>
    <q-checkbox v-model="isFullImagePath" label="Is Full Image Path" />
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
const isFullImagePath = ref(false);
const organizationName = ref("");
const websiteUrl = ref("");

async function setOrganization() {
  await createOrganization(
    description.value,
    imagePath.value,
    isFullImagePath.value,
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
