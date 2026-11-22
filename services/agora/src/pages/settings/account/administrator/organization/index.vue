<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
    <q-tabs
      v-if="
        managementAccess.data.value?.permissions.canCreateOrganizations ||
        managementAccess.data.value?.permissions.canManageOrganizations
      "
      v-model="activeTab"
      class="adminTabs"
      align="justify"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab
        v-if="managementAccess.data.value?.permissions.canCreateOrganizations"
        name="create"
        :label="t('createTab')"
      />
      <q-tab
        v-if="managementAccess.data.value?.permissions.canManageOrganizations"
        name="manage"
        :label="t('manageTab')"
      />
    </q-tabs>

    <ZKCard
      v-if="
        activeTab === 'create' &&
        managementAccess.data.value?.permissions.canCreateOrganizations
      "
      padding="1rem"
      class="cardBackground"
    >
      <OrganizationCreatePanel @created="organizationCreated" />
    </ZKCard>

    <template
      v-else-if="
        managementAccess.data.value?.permissions.canManageOrganizations
      "
    >
      <OrganizationManagePanel
        :key="viewerScope.userId"
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
import type { OrganizationManagementPermissions } from "src/shared/organizationAccess";
import type {
  AdminOrganizationOption,
  AdminOrganizationProperties,
} from "src/shared/types/dto";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { useManagementAccess } from "src/utils/api/useManagementAccess";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { ref, watch } from "vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });
const managementAccess = useManagementAccess();
const viewerScope = useViewerQueryScope();
const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const { getOrganizationDetails, getOrganizationOptions } =
  useBackendAdministratorOrganizationApi();

const organizationList = ref<AdminOrganizationOption[]>([]);
const selectedOrganization = ref<
  | (AdminOrganizationProperties & {
      permissions: OrganizationManagementPermissions;
    })
  | undefined
>(undefined);
const selectedOrganizationSlug = ref<string | undefined>(undefined);
const activeTab = ref<"create" | "manage">("manage");
const isLoadingOrganizations = ref(false);
let latestOrganizationDetailsRequest = 0;
let latestOrganizationOptionsRequest = 0;

watch(
  viewerScope,
  () => {
    latestOrganizationDetailsRequest += 1;
    latestOrganizationOptionsRequest += 1;
    selectedOrganization.value = undefined;
    selectedOrganizationSlug.value = undefined;
    organizationList.value = [];
    isLoadingOrganizations.value = false;
  },
  { flush: "sync" }
);

watch(
  [activeTab, isActive, managementAccess.dataUpdatedAt],
  async ([tab, active]) => {
    const canManage =
      managementAccess.data.value?.permissions.canManageOrganizations === true;
    const canCreate =
      managementAccess.data.value?.permissions.canCreateOrganizations === true;
    if (tab === "create" && !canCreate && canManage) activeTab.value = "manage";
    if (tab === "manage" && !canManage && canCreate) activeTab.value = "create";
    if (!canManage) {
      latestOrganizationDetailsRequest += 1;
      latestOrganizationOptionsRequest += 1;
      selectedOrganization.value = undefined;
      organizationList.value = [];
      isLoadingOrganizations.value = false;
      return;
    }
    if (active && tab === "manage") {
      await refreshOrganizations({ preserveDraft: true });
    }
  },
  { immediate: true }
);

watch(selectedOrganizationSlug, async (organizationSlug) => {
  await refreshSelectedOrganizationDetails({ organizationSlug });
});

async function refreshOrganizations({
  preferredOrganizationSlug,
  refreshSelectedDetails = true,
  preserveDraft = false,
}: {
  preferredOrganizationSlug?: string;
  refreshSelectedDetails?: boolean;
  preserveDraft?: boolean;
} = {}): Promise<void> {
  const requestId = ++latestOrganizationOptionsRequest;
  isLoadingOrganizations.value = true;
  try {
    const organizations = await getOrganizationOptions();
    if (requestId !== latestOrganizationOptionsRequest) return;
    organizationList.value = organizations;
  } finally {
    if (requestId === latestOrganizationOptionsRequest) {
      isLoadingOrganizations.value = false;
    }
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

    await refreshSelectedOrganizationDetails({
      organizationSlug: nextOrganizationSlug,
      preserveDraft,
    });
    return;
  }

  selectedOrganizationSlug.value = nextOrganizationSlug;
}

async function refreshSelectedOrganizationDetails({
  organizationSlug,
  preserveDraft = false,
}: {
  organizationSlug: string | undefined;
  preserveDraft?: boolean;
}): Promise<void> {
  latestOrganizationDetailsRequest += 1;
  const requestId = latestOrganizationDetailsRequest;

  if (selectedOrganization.value?.slug !== organizationSlug) {
    selectedOrganization.value = undefined;
  }

  if (organizationSlug === undefined) {
    selectedOrganization.value = undefined;
    return;
  }

  const organization = await getOrganizationDetails({ organizationSlug });
  if (requestId === latestOrganizationDetailsRequest) {
    if (
      preserveDraft &&
      organization !== undefined &&
      selectedOrganization.value?.slug === organization.slug
    ) {
      selectedOrganization.value.permissions = organization.permissions;
    } else {
      selectedOrganization.value = organization;
    }
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
