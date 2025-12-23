<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('administrator')" :center-content="true" />
    </template>

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
  </DrawerLayout>
</template>

<script setup lang="ts">
import CreateOrganizationForm from "src/components/administrator/organization/CreateOrganizationForm.vue";
import DeleteOrganizationForm from "src/components/administrator/organization/DeleteOrganizationForm.vue";
import UserOrganizationMappings from "src/components/administrator/organization/UserOrganizationMappings.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";

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
