<template>
  <div class="section">
    <ZKCard padding="1rem" class="cardBackground">
      <AdminSectionHeader
        :title="t('existingTitle')"
        :description="
          organizationList.length === 0 ? t('noOrganizationsMessage') : undefined
        "
      />

      <q-select
        v-if="organizationList.length > 0"
        :model-value="selectedOrganizationSlug"
        outlined
        :options="organizationOptions"
        :label="t('selectOrganizationLabel')"
        emit-value
        map-options
        @update:model-value="setSelectedOrganizationSlug"
      />
    </ZKCard>

    <template v-if="selectedOrganization !== undefined">
      <ZKCard padding="1rem" class="cardBackground">
        <AdminSectionHeader
          :title="t('editTitle')"
          :description="t('editDescription')"
        />

        <div class="badgeRow">
          <q-badge color="primary">
            {{ selectedOrganization.slug }}
          </q-badge>
          <q-badge color="secondary">
            {{ selectedOrganization.defaultLanguageCode }}
            {{ t("defaultLanguageBadge") }}
          </q-badge>
        </div>

        <form class="section" @submit.prevent="requestSlugUpdate">
          <div class="formGrid">
            <q-input
              :model-value="selectedOrganizationSlugDraft"
              outlined
              :label="t('slugLabel')"
              autocomplete="off"
              data-1p-ignore
              @update:model-value="setSelectedOrganizationSlugDraft"
            />
          </div>
          <ZKButton
            button-type="largeButton"
            :label="t('saveSlugButton')"
            type="submit"
            color="primary"
            outline
            :loading="isSavingSlug"
            :disable="!canSaveOrganizationSlug"
          />
        </form>

        <q-select
          :model-value="selectedLanguageCode"
          outlined
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
          <div class="formGrid">
            <q-input
              :model-value="editForm.displayName"
              outlined
              :label="t('nameLabel')"
              autocomplete="off"
              data-1p-ignore
              @update:model-value="
                (value) => setEditTextField({ field: 'displayName', value })
              "
            />
            <q-input
              :model-value="editForm.description"
              outlined
              :label="t('descriptionLabel')"
              type="textarea"
              autogrow
              @update:model-value="
                (value) => setEditTextField({ field: 'description', value })
              "
            />
            <q-input
              :model-value="editForm.imagePath"
              outlined
              :label="t('imagePathLabel')"
              :hint="t('imagePathHint')"
              @update:model-value="
                (value) => setEditTextField({ field: 'imagePath', value })
              "
            />
            <q-input
              :model-value="editForm.websiteUrl"
              outlined
              :label="t('websiteUrlLabel')"
              @update:model-value="
                (value) => setEditTextField({ field: 'websiteUrl', value })
              "
            />
          </div>
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
      </ZKCard>

      <ZKCard padding="1rem" class="cardBackground">
        <form class="section" @submit.prevent="submitAddMember">
          <AdminSectionHeader
            :title="t('addMemberTitle')"
            :description="t('membershipDescription')"
          />
          <div class="formGrid">
            <q-input
              :model-value="memberUsername"
              outlined
              :label="t('usernameLabel')"
              autocomplete="off"
              data-1p-ignore
              @update:model-value="setMemberUsername"
            />
          </div>
          <ZKButton
            button-type="largeButton"
            :label="t('addUserButton')"
            type="submit"
            color="primary"
            :loading="isAddingMember"
            :disable="memberUsername.trim().length === 0"
          />
        </form>
      </ZKCard>

      <ZKCard padding="1rem" class="cardBackground">
        <div class="section memberListSection">
          <AdminSectionHeader
            :title="t('memberListTitle')"
            :description="t('memberListDescription')"
          />
          <ZKButton
            button-type="largeButton"
            :label="t('fetchMembersButton')"
            color="primary"
            outline
            :loading="isLoadingMembers"
            @click="fetchMembers"
          />
          <p v-if="hasLoadedMembers && organizationMembers.length === 0">
            {{ t("noMembersMessage") }}
          </p>
          <div v-else-if="organizationMembers.length > 0" class="row-list">
            <div
              v-for="member in organizationMembers"
              :key="member.username"
              class="summary-row"
            >
              <div class="summary-title">{{ member.username }}</div>
              <q-btn
                flat
                color="negative"
                no-caps
                :loading="removingMemberUsername === member.username"
                :label="t('removeUserButton')"
                @click="removeFetchedMember(member.username)"
              />
            </div>
          </div>
        </div>
      </ZKCard>

      <ZKCard padding="1rem" class="cardBackground">
        <div class="dangerSection">
          <ZKButton
            button-type="largeButton"
            :label="t('archiveButton')"
            color="negative"
            :loading="isArchiving"
            @click="archiveButtonClicked"
          />
        </div>
      </ZKCard>
    </template>
  </div>

  <q-dialog v-model="showArchiveConfirmDialog">
    <q-card class="archiveDialog">
      <q-card-section>
        <div class="dialogTitle">{{ t("archiveButton") }}</div>
        <p>{{ t("archiveConfirmMessage") }}</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          no-caps
          :label="t('cancelButton')"
          @click="showArchiveConfirmDialog = false"
        />
        <q-btn
          color="negative"
          no-caps
          :label="t('confirmArchiveButton')"
          :loading="isArchiving"
          @click="confirmArchiveOrganization"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showSlugConfirmDialog">
    <q-card class="archiveDialog">
      <q-card-section>
        <div class="dialogTitle">{{ t("slugWarningTitle") }}</div>
        <p>{{ t("slugWarningDescription") }}</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          no-caps
          :label="t('cancelButton')"
          @click="showSlugConfirmDialog = false"
        />
        <q-btn
          color="primary"
          no-caps
          :label="t('confirmSlugChangeButton')"
          :loading="isSavingSlug"
          :disable="!canSaveOrganizationSlug"
          @click="confirmSlugUpdate"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type AdministratorOrganizationTranslations,
  administratorOrganizationTranslations,
} from "src/pages/settings/account/administrator/organization/index.i18n";
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
} from "src/pages/settings/account/administrator/organization/organizationAdminForm";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  type AdminOrganizationProperties,
  Dto,
  type OrganizationMember,
} from "src/shared/types/dto";
import { useLanguageStore } from "src/stores/language";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { computed, reactive, ref, watch } from "vue";

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
  getOrganizationMembers,
  removeUserOrganizationMapping,
  updateOrganizationLocalization,
  updateOrganizationSlug,
} = useBackendAdministratorOrganizationApi();

const selectedLanguageCode = ref<SupportedDisplayLanguageCodes>(
  languageStore.displayLanguage
);
const selectedOrganizationSlugDraft = ref("");
const memberUsername = ref("");
const organizationMembers = ref<OrganizationMember[]>([]);
const hasLoadedMembers = ref(false);
const removingMemberUsername = ref<string | undefined>(undefined);
const showArchiveConfirmDialog = ref(false);
const showSlugConfirmDialog = ref(false);
const isSaving = ref(false);
const isSavingSlug = ref(false);
const isAddingMember = ref(false);
const isLoadingMembers = ref(false);
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
      isOrganizationLocalizationDirty.value &&
      isUpdateOrganizationLocalizationFormValid({
        organizationSlug: organization.slug,
        languageCode: selectedLanguageCode.value,
        form: editForm,
        isDefaultLanguage: selectedLanguageIsDefault.value,
      })
    );
  }
);

const isOrganizationLocalizationDirty = computed(() => {
  const organization = selectedOrganization.value;
  if (organization === undefined) {
    return false;
  }

  const originalForm = getOrganizationLocalizationFormState({
    organization,
    languageCode: selectedLanguageCode.value,
  });

  return (
    editForm.displayName !== originalForm.displayName ||
    editForm.description !== originalForm.description ||
    editForm.imagePath !== originalForm.imagePath ||
    editForm.websiteUrl !== originalForm.websiteUrl ||
    editForm.setAsDefault !== originalForm.setAsDefault
  );
});

const canSaveOrganizationSlug = computed(() => {
  const organization = selectedOrganization.value;
  const trimmedSlug = selectedOrganizationSlugDraft.value.trim();
  return (
    organization !== undefined &&
    !isSavingSlug.value &&
    Dto.updateOrganizationSlugRequest.safeParse({
      currentOrganizationSlug: organization.slug,
      newOrganizationSlug: trimmedSlug,
    }).success &&
    trimmedSlug !== organization.slug
  );
});

watch(
  selectedOrganization,
  (organization) => {
    if (organization === undefined) {
      return;
    }

    selectedLanguageCode.value = organization.defaultLanguageCode;
    selectedOrganizationSlugDraft.value = organization.slug;
    organizationMembers.value = [];
    hasLoadedMembers.value = false;
    showSlugConfirmDialog.value = false;
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
  showArchiveConfirmDialog.value = false;
  showSlugConfirmDialog.value = false;
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

function setSelectedOrganizationSlugDraft(value: unknown): void {
  selectedOrganizationSlugDraft.value = inputToString(value);
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

function requestSlugUpdate(): void {
  if (!canSaveOrganizationSlug.value || isSavingSlug.value) {
    return;
  }

  showSlugConfirmDialog.value = true;
}

async function confirmSlugUpdate(): Promise<void> {
  const organization = selectedOrganization.value;
  if (
    organization === undefined ||
    !canSaveOrganizationSlug.value ||
    isSavingSlug.value
  ) {
    return;
  }

  isSavingSlug.value = true;
  const newOrganizationSlug = selectedOrganizationSlugDraft.value.trim();
  const success = await updateOrganizationSlug({
    currentOrganizationSlug: organization.slug,
    newOrganizationSlug,
  });
  isSavingSlug.value = false;

  if (success) {
    showSlugConfirmDialog.value = false;
    emit("update:selectedOrganizationSlug", newOrganizationSlug);
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
    if (hasLoadedMembers.value) {
      await fetchMembers();
    }
  }
}

async function fetchMembers(): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || isLoadingMembers.value) {
    return;
  }

  isLoadingMembers.value = true;
  organizationMembers.value = await getOrganizationMembers({
    organizationName: organization.slug,
  });
  hasLoadedMembers.value = true;
  isLoadingMembers.value = false;
}

async function removeFetchedMember(username: string): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || removingMemberUsername.value !== undefined) {
    return;
  }

  removingMemberUsername.value = username;
  const success = await removeUserOrganizationMapping({
    username,
    organizationName: organization.slug,
  });
  removingMemberUsername.value = undefined;

  if (success) {
    await fetchMembers();
  }
}

function archiveButtonClicked(): void {
  const organization = selectedOrganization.value;
  if (organization === undefined || isArchiving.value) {
    return;
  }

  showArchiveConfirmDialog.value = true;
}

async function confirmArchiveOrganization(): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || isArchiving.value) {
    return;
  }

  isArchiving.value = true;
  const success = await archiveOrganization({ organizationName: organization.slug });
  isArchiving.value = false;

  if (success) {
    showArchiveConfirmDialog.value = false;
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

.cardBackground {
  background-color: white;
}

.formGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.badgeRow,
.actionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.compact-list {
  margin-top: 0.75rem;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.summary-title {
  font-weight: 700;
}

.summary-meta {
  color: #6d6a74;
  font-size: 0.9rem;
}

.memberListSection p {
  margin: 0;
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
}

.dangerSection p {
  margin: 0;
  color: #7f1d1d;
  line-height: 1.4;
}

.archiveDialog {
  width: min(26rem, calc(100vw - 2rem));
}

.dialogTitle {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.archiveDialog p {
  margin: 0;
  color: #5f6368;
  line-height: 1.4;
}
</style>
