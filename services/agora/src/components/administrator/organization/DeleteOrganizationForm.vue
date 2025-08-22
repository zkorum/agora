<template>
  <div class="container">
    <div v-if="organizationList.length == 0">
      {{ t("noOrganizationsMessage") }}
    </div>
    <div v-for="organization in organizationList" :key="organization.name">
      <div>
        {{ organization.name }}
      </div>

      <OrganizationView :organization-name="organization.name" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import type { OrganizationProperties } from "src/shared/types/zod";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { onMounted, ref } from "vue";
import OrganizationView from "./OrganizationView.vue";
import {
  deleteOrganizationFormTranslations,
  type DeleteOrganizationFormTranslations,
} from "./DeleteOrganizationForm.i18n";

const { t } = useComponentI18n<DeleteOrganizationFormTranslations>(
  deleteOrganizationFormTranslations
);

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
