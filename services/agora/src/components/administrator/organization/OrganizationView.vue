<template>
  <div>
    <ZKButton
      button-type="largeButton"
      :label="t('deleteOrganizationButton')"
      @click="deleteOrganizationButtonClicked()"
    />

    <q-input
      v-model="username"
      :label="t('usernameLabel')"
      autocomplete="off"
      data-1p-ignore
    />

    <ZKButton
      button-type="largeButton"
      :label="t('addUserToOrganizationButton')"
      :disable="username.length == 0"
      @click="addUserToOrganizationClicked()"
    />
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

import {
  type OrganizationViewTranslations,
  organizationViewTranslations,
} from "./OrganizationView.i18n";

const props = defineProps<{
  organizationName: string;
}>();

const { t } = useComponentI18n<OrganizationViewTranslations>(
  organizationViewTranslations
);

const username = ref("");

const { deleteOrganization, addUserOrganizationMapping } =
  useBackendAdministratorOrganizationApi();

async function deleteOrganizationButtonClicked() {
  await deleteOrganization(props.organizationName);
}

async function addUserToOrganizationClicked() {
  await addUserOrganizationMapping(username.value, props.organizationName);
}
</script>

<style lang="scss" scoped></style>
