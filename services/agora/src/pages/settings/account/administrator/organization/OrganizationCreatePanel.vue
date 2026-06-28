<template>
  <form class="section" @submit.prevent="submitCreateOrganization">
    <div class="sectionHeader">
      <h2>{{ t("createTitle") }}</h2>
      <p>{{ t("createDescription") }}</p>
    </div>

    <q-input
      :model-value="form.organizationName"
      :label="t('nameLabel')"
      autocomplete="off"
      data-1p-ignore
      @update:model-value="
        (value) => setTextField({ field: 'organizationName', value })
      "
    />
    <q-input
      :model-value="form.organizationSlug"
      :label="t('slugLabel')"
      :error="form.organizationSlug.length > 0 && !isSlugValid"
      autocomplete="off"
      data-1p-ignore
      @update:model-value="
        (value) => setTextField({ field: 'organizationSlug', value })
      "
    />
    <q-select
      :model-value="form.defaultLanguageCode"
      :options="displayLanguageOptions"
      :label="t('defaultLanguageLabel')"
      emit-value
      map-options
      @update:model-value="setDefaultLanguage"
    />
    <q-input
      :model-value="form.description"
      :label="t('descriptionLabel')"
      type="textarea"
      autogrow
      @update:model-value="
        (value) => setTextField({ field: 'description', value })
      "
    />
    <q-input
      :model-value="form.imagePath"
      :label="t('imagePathLabel')"
      :hint="t('imagePathHint')"
      @update:model-value="(value) => setTextField({ field: 'imagePath', value })"
    />
    <q-input
      :model-value="form.websiteUrl"
      :label="t('websiteUrlLabel')"
      @update:model-value="(value) => setTextField({ field: 'websiteUrl', value })"
    />
    <ZKButton
      button-type="largeButton"
      :label="t('createButton')"
      type="submit"
      color="primary"
      :loading="isCreating"
      :disable="!canCreateOrganization"
    />
  </form>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { zodOrganizationSlug } from "src/shared/types/zod";
import {
  createRandomOrganizationSlugFallback,
  slugifyOrganizationDisplayName,
} from "src/shared-app-api/organizationSlug";
import { useLanguageStore } from "src/stores/language";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { computed, reactive, ref, watch } from "vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";
import {
  buildCreateOrganizationRequest,
  displayLanguageOptions,
  inputToString,
  isCreateOrganizationFormValid,
  type OrganizationCreateFormState,
  parseDisplayLanguage,
} from "./organizationAdminForm";

type CreateTextField =
  | "organizationName"
  | "organizationSlug"
  | "description"
  | "imagePath"
  | "websiteUrl";

const emit = defineEmits<{
  created: [organizationSlug: string];
}>();

const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const languageStore = useLanguageStore();
const { createOrganization } = useBackendAdministratorOrganizationApi();

const form = reactive<OrganizationCreateFormState>({
  organizationName: "",
  organizationSlug: "",
  defaultLanguageCode: languageStore.displayLanguage,
  description: "",
  imagePath: "",
  websiteUrl: "",
});
const fallbackOrganizationSlug = ref(createRandomOrganizationSlugFallback());
const hasEditedOrganizationSlug = ref(false);
const isCreating = ref(false);

const isSlugValid = computed(
  () => zodOrganizationSlug.safeParse(form.organizationSlug).success
);
const canCreateOrganization = computed(
  () => isCreateOrganizationFormValid(form)
);

watch(
  () => form.organizationName,
  (name) => {
    if (!hasEditedOrganizationSlug.value) {
      form.organizationSlug =
        slugifyOrganizationDisplayName(name) ?? fallbackOrganizationSlug.value;
    }
  }
);

function setTextField({
  field,
  value,
}: {
  field: CreateTextField;
  value: unknown;
}): void {
  form[field] = inputToString(value);
  if (field === "organizationSlug") {
    hasEditedOrganizationSlug.value = true;
  }
}

function setDefaultLanguage(value: unknown): void {
  const languageCode = parseDisplayLanguage(value);
  if (languageCode !== undefined) {
    form.defaultLanguageCode = languageCode;
  }
}

function resetForm(): void {
  form.organizationName = "";
  form.organizationSlug = "";
  form.description = "";
  form.imagePath = "";
  form.websiteUrl = "";
  form.defaultLanguageCode = languageStore.displayLanguage;
  hasEditedOrganizationSlug.value = false;
  fallbackOrganizationSlug.value = createRandomOrganizationSlugFallback();
}

async function submitCreateOrganization(): Promise<void> {
  if (!canCreateOrganization.value || isCreating.value) {
    return;
  }

  isCreating.value = true;
  const request = buildCreateOrganizationRequest(form);
  const success = await createOrganization(request);
  isCreating.value = false;

  if (success) {
    resetForm();
    emit("created", request.organizationSlug);
  }
}
</script>

<style scoped lang="scss">
.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sectionHeader {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sectionHeader h2,
.sectionHeader p {
  margin: 0;
}

.sectionHeader p {
  color: #5f6368;
  line-height: 1.4;
}
</style>
