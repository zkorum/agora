<template>
  <div class="container">
    <div v-if="organizationList.length == 0">
      No organizations are registered in the system
    </div>
    <div v-for="organization in organizationList" :key="organization.name">
      <div>
        {{ organization }}
      </div>

      <ZKButton
        button-type="largeButton"
        label="Delete Organization"
        @click="deleteOrganizationButtonClicked(organization.name)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { OrganizationProperties } from "src/shared/types/zod";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { onMounted, ref } from "vue";

const { deleteOrganization, getAllOrganizations } =
  useBackendAdministratorOrganizationApi();

const organizationList = ref<OrganizationProperties[]>([]);

onMounted(async () => {
  organizationList.value = await getAllOrganizations();
});

async function deleteOrganizationButtonClicked(organizationName: string) {
  await deleteOrganization(organizationName);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
