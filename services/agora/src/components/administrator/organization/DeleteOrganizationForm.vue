<template>
  <form class="container" @submit.prevent="deleteOrganization()">
    <q-input
      v-model="username"
      label="Username"
      autocomplete="off"
      data-1p-ignore
    />
    <ZKButton
      button-type="largeButton"
      label="Delete Organization"
      type="submit"
    />
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const { deleteUserOrganization } = useBackendAdministratorOrganizationApi();

const username = ref("");

async function deleteOrganization() {
  await deleteUserOrganization(username.value);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
