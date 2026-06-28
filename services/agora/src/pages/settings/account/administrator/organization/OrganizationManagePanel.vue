<template>
  <div class="section">
    <div class="sectionHeader">
      <h2>{{ t("existingTitle") }}</h2>
      <p v-if="organizationList.length === 0">
        {{ t("noOrganizationsMessage") }}
      </p>
    </div>

    <q-select
      v-if="organizationList.length > 0"
      :model-value="selectedOrganizationSlug"
      :options="organizationOptions"
      :label="t('selectOrganizationLabel')"
      emit-value
      map-options
      @update:model-value="setSelectedOrganizationSlug"
    />

    <template v-if="selectedOrganization !== undefined">
      <div class="sectionHeader compactHeader">
        <h3>{{ t("editTitle") }}</h3>
        <p>{{ t("editDescription") }}</p>
      </div>

      <div class="badgeRow">
        <q-badge color="primary">
          {{ selectedOrganization.slug }}
        </q-badge>
        <q-badge color="secondary">
          {{ selectedOrganization.defaultLanguageCode }}
          {{ t("defaultLanguageBadge") }}
        </q-badge>
      </div>

      <q-select
        :model-value="selectedLanguageCode"
        :options="localizedLanguageOptions"
        :label="t('languageLabel')"
        emit-value
        map-options
        @update:model-value="setSelectedLanguageCode"
      />

      <q-banner v-if="!selectedLanguageHasLocalization" class="hintBanner">
        {{ t("localizationMissingHint") }}
      </q-banner>

      <form class="section" @submit.prevent="submitUpdateOrganization">
        <q-input
          :model-value="editForm.displayName"
          :label="t('nameLabel')"
          autocomplete="off"
          data-1p-ignore
          @update:model-value="
            (value) => setEditTextField({ field: 'displayName', value })
          "
        />
        <q-input
          :model-value="editForm.description"
          :label="t('descriptionLabel')"
          type="textarea"
          autogrow
          @update:model-value="
            (value) => setEditTextField({ field: 'description', value })
          "
        />
        <q-input
          :model-value="editForm.imagePath"
          :label="t('imagePathLabel')"
          :hint="t('imagePathHint')"
          @update:model-value="
            (value) => setEditTextField({ field: 'imagePath', value })
          "
        />
        <q-input
          :model-value="editForm.websiteUrl"
          :label="t('websiteUrlLabel')"
          @update:model-value="
            (value) => setEditTextField({ field: 'websiteUrl', value })
          "
        />
        <q-checkbox
          :model-value="editForm.setAsDefault"
          :label="t('defaultLanguageLabel')"
          :disable="selectedLanguageIsDefault"
          @update:model-value="setEditDefault"
        />
        <ZKButton
          button-type="largeButton"
          :label="t('saveButton')"
          type="submit"
          color="primary"
          :loading="isSaving"
          :disable="!canSaveOrganization"
        />
      </form>

      <form class="section" @submit.prevent="submitAddMember">
        <div class="sectionHeader compactHeader">
          <h3>{{ t("addMemberTitle") }}</h3>
        </div>
        <q-input
          :model-value="memberUsername"
          :label="t('usernameLabel')"
          autocomplete="off"
          data-1p-ignore
          @update:model-value="setMemberUsername"
        />
        <ZKButton
          button-type="largeButton"
          :label="t('addUserButton')"
          type="submit"
          :loading="isAddingMember"
          :disable="memberUsername.trim().length === 0"
        />
      </form>

      <div class="dangerSection">
        <p v-if="isConfirmingArchive">
          {{ t("archiveConfirmMessage") }}
        </p>
        <div class="actionRow">
          <ZKButton
            button-type="largeButton"
            :label="
              isConfirmingArchive ? t('confirmArchiveButton') : t('archiveButton')
            "
            color="negative"
            :loading="isArchiving"
            @click="archiveButtonClicked"
          />
          <ZKButton
            v-if="isConfirmingArchive"
            button-type="largeButton"
            :label="t('cancelButton')"
            @click="archiveConfirmationSlug = undefined"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { AdminOrganizationProperties } from "src/shared/types/dto";
import { useLanguageStore } from "src/stores/language";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { computed, reactive, ref, watch } from "vue";

import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "./index.i18n";
import {
  buildUpdateOrganizationLocalizationRequest,
  displayLanguageOptions,
  getOrganizationLocalizationFormState,
  hasOrganizationLocalization,
  inputToString,
  isUpdateOrganizationLocalizationFormValid,
  type OrganizationLocalizationFormState,
  parseDisplayLanguage,
  type SelectOption,
} from "./organizationAdminForm";

type EditTextField = "displayName" | "description" | "imagePath" | "websiteUrl";

const props = defineProps<{
  organizationList: AdminOrganizationProperties[];
  selectedOrganizationSlug: string | undefined;
}>();

const emit = defineEmits<{
  "update:selectedOrganizationSlug": [organizationSlug: string | undefined];
  archived: [];
  saved: [];
}>();

const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const languageStore = useLanguageStore();
const {
  addUserOrganizationMapping,
  archiveOrganization,
  updateOrganizationLocalization,
} = useBackendAdministratorOrganizationApi();

const selectedLanguageCode = ref<SupportedDisplayLanguageCodes>(
  languageStore.displayLanguage
);
const memberUsername = ref("");
const archiveConfirmationSlug = ref<string | undefined>(undefined);
const isSaving = ref(false);
const isAddingMember = ref(false);
const isArchiving = ref(false);

const editForm = reactive<OrganizationLocalizationFormState>({
  displayName: "",
  description: "",
  imagePath: "",
  websiteUrl: "",
  setAsDefault: false,
});

const selectedOrganization = computed(() =>
  props.organizationList.find(
    (organization) => organization.slug === props.selectedOrganizationSlug
  )
);

const organizationOptions = computed<Array<SelectOption<string>>>(() =>
  props.organizationList.map((organization) => ({
    label: `${organization.name} (${organization.slug})`,
    value: organization.slug,
  }))
);

const localizedLanguageOptions = computed(
  (): Array<SelectOption<SupportedDisplayLanguageCodes>> => {
    const organization = selectedOrganization.value;
    const localizedLanguageCodes = new Set(
      organization?.localizations.map((localization) => localization.languageCode) ??
        []
    );

    return displayLanguageOptions.map((option) => ({
      ...option,
      label: `${option.label} - ${
        localizedLanguageCodes.has(option.value)
          ? t("localizationReadyBadge")
          : t("localizationMissingBadge")
      }`,
    }));
  }
);

const selectedLanguageIsDefault = computed(
  () => selectedLanguageCode.value === selectedOrganization.value?.defaultLanguageCode
);

const selectedLanguageHasLocalization = computed(() => {
  const organization = selectedOrganization.value;
  if (organization === undefined) {
    return false;
  }

  return hasOrganizationLocalization({
    organization,
    languageCode: selectedLanguageCode.value,
  });
});

const canSaveOrganization = computed(
  () => {
    const organization = selectedOrganization.value;
    return (
      organization !== undefined &&
      isUpdateOrganizationLocalizationFormValid({
        organizationSlug: organization.slug,
        languageCode: selectedLanguageCode.value,
        form: editForm,
        isDefaultLanguage: selectedLanguageIsDefault.value,
      })
    );
  }
);

const isConfirmingArchive = computed(
  () => archiveConfirmationSlug.value === selectedOrganization.value?.slug
);

watch(
  selectedOrganization,
  (organization) => {
    if (organization === undefined) {
      return;
    }

    selectedLanguageCode.value = organization.defaultLanguageCode;
  },
  { immediate: true }
);

watch(
  [selectedOrganization, selectedLanguageCode],
  () => {
    populateEditForm();
  },
  { immediate: true }
);

function setSelectedOrganizationSlug(value: unknown): void {
  const slug = inputToString(value);
  emit("update:selectedOrganizationSlug", slug.length === 0 ? undefined : slug);
  archiveConfirmationSlug.value = undefined;
}

function setSelectedLanguageCode(value: unknown): void {
  const languageCode = parseDisplayLanguage(value);
  if (languageCode !== undefined) {
    selectedLanguageCode.value = languageCode;
  }
}

function setEditTextField({
  field,
  value,
}: {
  field: EditTextField;
  value: unknown;
}): void {
  editForm[field] = inputToString(value);
}

function setEditDefault(value: unknown): void {
  editForm.setAsDefault = selectedLanguageIsDefault.value || value === true;
}

function setMemberUsername(value: unknown): void {
  memberUsername.value = inputToString(value);
}

function populateEditForm(): void {
  const organization = selectedOrganization.value;
  if (organization === undefined) {
    editForm.displayName = "";
    editForm.description = "";
    editForm.imagePath = "";
    editForm.websiteUrl = "";
    editForm.setAsDefault = false;
    return;
  }

  const formState = getOrganizationLocalizationFormState({
    organization,
    languageCode: selectedLanguageCode.value,
  });
  editForm.displayName = formState.displayName;
  editForm.description = formState.description;
  editForm.imagePath = formState.imagePath;
  editForm.websiteUrl = formState.websiteUrl;
  editForm.setAsDefault = formState.setAsDefault;
}

async function submitUpdateOrganization(): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || !canSaveOrganization.value || isSaving.value) {
    return;
  }

  isSaving.value = true;
  const success = await updateOrganizationLocalization(
    buildUpdateOrganizationLocalizationRequest({
      organizationSlug: organization.slug,
      languageCode: selectedLanguageCode.value,
      form: editForm,
      isDefaultLanguage: selectedLanguageIsDefault.value,
    })
  );
  isSaving.value = false;

  if (success) {
    emit("saved");
  }
}

async function submitAddMember(): Promise<void> {
  const organization = selectedOrganization.value;
  if (
    organization === undefined ||
    memberUsername.value.trim().length === 0 ||
    isAddingMember.value
  ) {
    return;
  }

  isAddingMember.value = true;
  const success = await addUserOrganizationMapping({
    username: memberUsername.value,
    organizationName: organization.slug,
  });
  isAddingMember.value = false;

  if (success) {
    memberUsername.value = "";
  }
}

async function archiveButtonClicked(): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || isArchiving.value) {
    return;
  }

  if (!isConfirmingArchive.value) {
    archiveConfirmationSlug.value = organization.slug;
    return;
  }

  isArchiving.value = true;
  const success = await archiveOrganization({ organizationName: organization.slug });
  isArchiving.value = false;

  if (success) {
    archiveConfirmationSlug.value = undefined;
    emit("archived");
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
.sectionHeader h3,
.sectionHeader p {
  margin: 0;
}

.sectionHeader p {
  color: #5f6368;
  line-height: 1.4;
}

.compactHeader {
  margin-top: 0.5rem;
}

.badgeRow,
.actionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actionRow > * {
  flex: 1 1 12rem;
}

.hintBanner {
  border-radius: 12px;
  background: #f5f7fb;
}

.dangerSection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid #f0c4c4;
  border-radius: 16px;
  padding: 1rem;
}

.dangerSection p {
  margin: 0;
  color: #7f1d1d;
  line-height: 1.4;
}
</style>
