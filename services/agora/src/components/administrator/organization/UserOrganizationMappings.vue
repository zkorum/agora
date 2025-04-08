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

      <div v-for="organization in organizationList" :key="organization">
        <div>
          {{ organization }}
        </div>

        <ZKButton
          button-type="largeButton"
          label="Remove user organization mapping"
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

const { getOrganizationNamesByUsername, removeUserOrganizationMapping } =
  useBackendAdministratorOrganizationApi();

const organizationList = ref<string[]>([]);

const username = ref("");
const dataLoaded = ref(false);

async function fetchOrganizations() {
  organizationList.value = await getOrganizationNamesByUsername(username.value);
  dataLoaded.value = true;
}

async function deleteOrganizationButtonClicked(organizationName: string) {
  await removeUserOrganizationMapping(username.value, organizationName);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
