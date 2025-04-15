<template>
  <div>
    <ZKButton
      button-type="largeButton"
      label="Delete Organization"
      @click="deleteOrganizationButtonClicked()"
    />

    <q-input
      v-model="username"
      label="Username"
      autocomplete="off"
      data-1p-ignore
    />

    <ZKButton
      button-type="largeButton"
      label="Add User to Organization"
      :disable="username.length == 0"
      @click="addUserToOrganizationClicked()"
    />
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const props = defineProps<{
  organizationName: string;
}>();

const username = ref("");

const { deleteOrganization, addUserOrganizationMapping } =
  useBackendAdministratorOrganizationApi();

async function deleteOrganizationButtonClicked() {
  await deleteOrganization(props.organizationName);
}

async function addUserToOrganizationClicked() {
  await addUserOrganizationMapping(username.value, props.organizationName);
}
</script>

<style lang="scss" scoped></style>
