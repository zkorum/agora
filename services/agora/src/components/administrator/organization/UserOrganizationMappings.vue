<template>
  <form class="container">
    <q-input
      v-model="username"
      label="Username"
      autocomplete="off"
      data-1p-ignore
    />
    <ZKButton
      button-type="largeButton"
      label="Fetch"
      :disable="username.length == 0"
      @click="fetchOrganizations()"
    />

    <div v-if="dataLoaded">
      <div v-if="organizationList.length == 0">
        User does not belong to any organizations
      </div>

      <q-input
        v-model="organizationName"
        label="Organization name"
        autocomplete="off"
        data-1p-ignore
      />

      <ZKButton
        button-type="largeButton"
        label="Add user to organization"
        :disable="username.length == 0 || organizationName.length == 0"
        @click="addUserToOrganizationClicked()"
      />

      <div v-for="organization in organizationList" :key="organization">
        <div>
          {{ organization }}
        </div>

        <ZKButton
          button-type="largeButton"
          label="Delete Organization"
          @click="deleteOrganizationButtonClicked(organization)"
        />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

const {
  getOrganizationNamesByUsername,
  removeUserOrganizationMapping,
  addUserOrganizationMapping,
} = useBackendAdministratorOrganizationApi();

const organizationList = ref<string[]>([]);

const username = ref("");
const organizationName = ref("");
const dataLoaded = ref(false);

async function fetchOrganizations() {
  organizationList.value = await getOrganizationNamesByUsername(username.value);
  dataLoaded.value = true;
}

async function deleteOrganizationButtonClicked(organizationName: string) {
  await removeUserOrganizationMapping(username.value, organizationName);
}

async function addUserToOrganizationClicked() {
  await addUserOrganizationMapping(username.value, organizationName.value);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
