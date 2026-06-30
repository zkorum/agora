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
        :selected-organization="selectedOrganization"
        :is-loading-organizations="isLoadingOrganizations"
        @deleted="refreshOrganizations"
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
import type {
  AdminOrganizationOption,
  AdminOrganizationProperties,
} from "src/shared/types/dto";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref, watch } from "vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });
const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const { getOrganizationDetails, getOrganizationOptions } =
  useBackendAdministratorOrganizationApi();

const organizationList = ref<AdminOrganizationOption[]>([]);
const selectedOrganization = ref<AdminOrganizationProperties | undefined>(
  undefined
);
const selectedOrganizationSlug = ref<string | undefined>(undefined);
const activeTab = ref<"create" | "manage">("create");
const isLoadingOrganizations = ref(false);
let latestOrganizationDetailsRequest = 0;

watch(activeTab, async (tab) => {
  if (
    tab === "manage" &&
    organizationList.value.length === 0 &&
    !isLoadingOrganizations.value
  ) {
    await refreshOrganizations();
  }
});

watch(selectedOrganizationSlug, async (organizationSlug) => {
  await refreshSelectedOrganizationDetails(organizationSlug);
});

async function refreshOrganizations({
  preferredOrganizationSlug,
  refreshSelectedDetails = true,
}: {
  preferredOrganizationSlug?: string;
  refreshSelectedDetails?: boolean;
} = {}): Promise<void> {
  isLoadingOrganizations.value = true;
  try {
    organizationList.value = await getOrganizationOptions();
  } finally {
    isLoadingOrganizations.value = false;
  }
  const hasPreferredOrganization = organizationList.value.some(
    (organization) => organization.slug === preferredOrganizationSlug
  );
  const hasSelectedOrganization = organizationList.value.some(
    (organization) => organization.slug === selectedOrganizationSlug.value
  );
  const nextOrganizationSlug = hasPreferredOrganization
    ? preferredOrganizationSlug
    : hasSelectedOrganization
      ? selectedOrganizationSlug.value
      : organizationList.value[0]?.slug;

  if (selectedOrganizationSlug.value === nextOrganizationSlug) {
    if (!refreshSelectedDetails) {
      return;
    }

    await refreshSelectedOrganizationDetails(nextOrganizationSlug);
    return;
  }

  selectedOrganizationSlug.value = nextOrganizationSlug;
}

async function refreshSelectedOrganizationDetails(
  organizationSlug: string | undefined
): Promise<void> {
  latestOrganizationDetailsRequest += 1;
  const requestId = latestOrganizationDetailsRequest;

  if (organizationSlug === undefined) {
    selectedOrganization.value = undefined;
    return;
  }

  const organization = await getOrganizationDetails({ organizationSlug });
  if (requestId === latestOrganizationDetailsRequest) {
    selectedOrganization.value = organization;
  }
}

async function organizationCreated(organizationSlug: string): Promise<void> {
  await refreshOrganizations({ preferredOrganizationSlug: organizationSlug });
  activeTab.value = "manage";
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: max(3rem, calc(env(safe-area-inset-bottom) + 2rem));
}

.cardBackground {
  background-color: white;
}

.adminTabs {
  border-radius: 1rem;
  background: white;
}
</style>
