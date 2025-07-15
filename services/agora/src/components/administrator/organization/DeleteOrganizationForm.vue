<template>
  <div class="container">
    <div v-if="organizationList.length == 0">
      No organizations are registered in the system
    </div>
    <div v-for="organization in organizationList" :key="organization.name">
      <div>
        {{ organization }}
      </div>

      <OrganizationView :organization-name="organization.name" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OrganizationProperties } from "src/shared/types/zod";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { onMounted, ref } from "vue";
import OrganizationView from "./OrganizationView.vue";

const { getAllOrganizations } = useBackendAdministratorOrganizationApi();

const organizationList = ref<OrganizationProperties[]>([]);

onMounted(async () => {
  organizationList.value = await getAllOrganizations();
});
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
