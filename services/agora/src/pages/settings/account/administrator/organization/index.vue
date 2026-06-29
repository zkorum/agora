<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
    <q-tabs
      v-model="activeTab"
      class="adminTabs"
      align="justify"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab name="create" :label="t('createTab')" />
      <q-tab name="manage" :label="t('manageTab')" />
    </q-tabs>

    <ZKCard v-if="activeTab === 'create'" padding="1rem" class="cardBackground">
      <OrganizationCreatePanel @created="organizationCreated" />
    </ZKCard>

    <template v-else>
      <OrganizationManagePanel
        v-model:selected-organization-slug="selectedOrganizationSlug"
        :organization-list="organizationList"
        @archived="refreshOrganizations"
        @saved="refreshOrganizations"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import OrganizationCreatePanel from "src/components/administrator/organization/OrganizationCreatePanel.vue";
import OrganizationManagePanel from "src/components/administrator/organization/OrganizationManagePanel.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AdminOrganizationProperties } from "src/shared/types/dto";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { onMounted, ref } from "vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const { getAllOrganizations } = useBackendAdministratorOrganizationApi();

const organizationList = ref<AdminOrganizationProperties[]>([]);
const selectedOrganizationSlug = ref<string | undefined>(undefined);
const activeTab = ref<"create" | "manage">("create");

onMounted(async () => {
  await refreshOrganizations();
});

async function refreshOrganizations(): Promise<void> {
  organizationList.value = await getAllOrganizations();
  if (
    selectedOrganizationSlug.value === undefined ||
    !organizationList.value.some(
      (organization) => organization.slug === selectedOrganizationSlug.value
    )
  ) {
    selectedOrganizationSlug.value = organizationList.value[0]?.slug;
  }
}

async function organizationCreated(organizationSlug: string): Promise<void> {
  await refreshOrganizations();
  selectedOrganizationSlug.value = organizationSlug;
  activeTab.value = "manage";
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cardBackground {
  background-color: white;
}

.adminTabs {
  border-radius: 1rem;
  background: white;
}
</style>
