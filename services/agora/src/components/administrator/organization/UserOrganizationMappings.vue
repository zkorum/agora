<template>
  <form class="container">
    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input
      v-model="username"
      :label="t('usernameLabel')"
      autocomplete="off"
      data-1p-ignore
    />
    <ZKButton
      button-type="largeButton"
      :label="t('fetchButton')"
      :disable="username.length == 0"
      @click="fetchOrganizations()"
    />

    <div v-if="dataLoaded">
      <div v-if="organizationList.length == 0">
        {{ t("noOrganizationsMessage") }}
      </div>

      <div v-for="organization in organizationList" :key="organization.name">
        <div>
          {{ organization.name }}
        </div>

        <ZKButton
          button-type="largeButton"
          :label="t('removeUserOrganizationMappingButton')"
          @click="deleteOrganizationButtonClicked(organization.name)"
        />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OrganizationProperties } from "src/shared/types/zod";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

import {
  type UserOrganizationMappingsTranslations,
  userOrganizationMappingsTranslations,
} from "./UserOrganizationMappings.i18n";

const { t } = useComponentI18n<UserOrganizationMappingsTranslations>(
  userOrganizationMappingsTranslations
);

const { getOrganizationsByUsername, removeUserOrganizationMapping } =
  useBackendAdministratorOrganizationApi();

const organizationList = ref<OrganizationProperties[]>([]);

const username = ref("");
const dataLoaded = ref(false);

async function fetchOrganizations() {
  organizationList.value = await getOrganizationsByUsername(username.value);
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
