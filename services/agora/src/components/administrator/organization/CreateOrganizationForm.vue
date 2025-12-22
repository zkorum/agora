<template>
  <form class="container" @submit.prevent="setOrganization()">
    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input
      v-model="organizationName"
      :label="t('nameLabel')"
      autocomplete="off"
      data-1p-ignore
    />
    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input v-model="description" :label="t('descriptionLabel')" />
    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input v-model="imagePath" :label="t('imagePathLabel')" />
    <div>{{ t("fileNameExample") }}</div>
    <div>{{ t("fullPathExample") }}</div>
    <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
    <q-input v-model="websiteUrl" :label="t('websiteUrlLabel')" />
    <ZKButton
      button-type="largeButton"
      :label="t('addOrganizationButton')"
      type="submit"
    />
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { ref } from "vue";

import {
  type CreateOrganizationFormTranslations,
  createOrganizationFormTranslations,
} from "./CreateOrganizationForm.i18n";

const { t } = useComponentI18n<CreateOrganizationFormTranslations>(
  createOrganizationFormTranslations
);

const { createOrganization } = useBackendAdministratorOrganizationApi();

const description = ref("");
const imagePath = ref("");
const organizationName = ref("");
const websiteUrl = ref("");

function isHttpsUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function setOrganization() {
  await createOrganization(
    description.value,
    imagePath.value,
    isHttpsUrl(imagePath.value),
    organizationName.value,
    websiteUrl.value
  );
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
