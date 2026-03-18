<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('administrator')" :center-content="true" />
  </Teleport>

  <div class="container">
      <ZKCard padding="1rem" class="cardBackground">
        <CreateOrganizationForm />
      </ZKCard>

      <ZKCard padding="1rem" class="cardBackground">
        <DeleteOrganizationForm />
      </ZKCard>

      <ZKCard padding="1rem" class="cardBackground">
        <UserOrganizationMappings />
      </ZKCard>
    </div>
</template>

<script setup lang="ts">
import CreateOrganizationForm from "src/components/administrator/organization/CreateOrganizationForm.vue";
import DeleteOrganizationForm from "src/components/administrator/organization/DeleteOrganizationForm.vue";
import UserOrganizationMappings from "src/components/administrator/organization/UserOrganizationMappings.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });

const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 1rem;
}

.cardBackground {
  background-color: white;
}
</style>
