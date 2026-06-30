<template>
  <div class="section">
    <ZKCard padding="1rem" class="cardBackground">
      <AdminSectionHeader
        :title="t('existingTitle')"
        :description="
          isLoadingOrganizations
            ? t('loadingOrganizationsMessage')
            : organizationList.length === 0
              ? t('noOrganizationsMessage')
              : undefined
        "
      />

      <ZKSelect
        v-if="organizationList.length > 0"
        v-model="selectedOrganizationSlugSelectModel"
        class="headerSelect"
        :options="organizationOptions"
        :label="t('selectOrganizationLabel')"
        :loading="isLoadingOrganizations"
        :disable="isLoadingOrganizations"
        searchable
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

        <form
          class="section localizationSection"
          @submit.prevent="submitUpdateOrganization"
        >
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

      <ZKCard padding="0" class="cardBackground dangerZoneCard">
        <div class="dangerZoneTitle">{{ t("dangerZoneTitle") }}</div>

        <form class="dangerZoneRow" @submit.prevent="requestSlugUpdate">
          <div class="dangerZoneContent">
            <div class="dangerZoneRowTitle">
              {{ t("changeSlugDangerTitle") }}
            </div>
            <div class="dangerZoneDescription">
              {{ t("changeSlugDangerDescription") }}
            </div>
            <q-input
              :model-value="selectedOrganizationSlugDraft"
              class="dangerZoneInput"
              outlined
              dense
              :label="t('slugLabel')"
              autocomplete="off"
              data-1p-ignore
              @update:model-value="setSelectedOrganizationSlugDraft"
            />
          </div>
          <q-btn
            class="dangerZoneAction"
            type="submit"
            color="negative"
            outline
            no-caps
            :label="t('saveSlugButton')"
            :loading="isSavingSlug"
            :disable="!canSaveOrganizationSlug"
          />
        </form>

        <div class="dangerZoneRow">
          <div class="dangerZoneContent">
            <div class="dangerZoneRowTitle">{{ t("deleteDangerTitle") }}</div>
            <div class="dangerZoneDescription">
              {{ t("deleteDangerDescription") }}
            </div>
          </div>
          <q-btn
            class="dangerZoneAction"
            color="negative"
            outline
            no-caps
            :label="t('deleteButton')"
            :loading="isDeleting"
            @click="deleteButtonClicked"
          />
        </div>
      </ZKCard>
    </template>
  </div>

  <ZKConfirmDialog
    v-model="showDeleteConfirmDialog"
    :title="t('deleteButton')"
    :message="t('deleteConfirmMessage')"
    :confirm-text="t('confirmDeleteButton')"
    :cancel-text="t('cancelButton')"
    variant="destructive"
    @confirm="confirmDeleteOrganization"
  />

  <ZKConfirmDialog
    v-model="showSlugConfirmDialog"
    :title="t('slugWarningTitle')"
    :message="t('slugWarningDescription')"
    :confirm-text="t('confirmSlugChangeButton')"
    :cancel-text="t('cancelButton')"
    variant="destructive"
    @confirm="confirmSlugUpdate"
  />
</template>

<script setup lang="ts">
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKSelect from "src/components/ui-library/ZKSelect.vue";
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
  type AdminOrganizationOption,
  type AdminOrganizationProperties,
  Dto,
  type OrganizationMember,
} from "src/shared/types/dto";
import { useLanguageStore } from "src/stores/language";
import { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import { computed, reactive, ref, watch } from "vue";

type EditTextField = "displayName" | "description" | "imagePath" | "websiteUrl";
type ZKSelectModel = string | string[] | null;

const props = defineProps<{
  organizationList: AdminOrganizationOption[];
  selectedOrganizationSlug: string | undefined;
  selectedOrganization: AdminOrganizationProperties | undefined;
  isLoadingOrganizations: boolean;
}>();

const emit = defineEmits<{
  "update:selectedOrganizationSlug": [organizationSlug: string | undefined];
  deleted: [];
  saved: [options?: { refreshSelectedDetails?: boolean }];
}>();

const { t } = useComponentI18n<AdministratorOrganizationTranslations>(
  administratorOrganizationTranslations
);
const languageStore = useLanguageStore();
const {
  addUserOrganizationMapping,
  deleteOrganization,
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
const showDeleteConfirmDialog = ref(false);
const showSlugConfirmDialog = ref(false);
const isSaving = ref(false);
const isSavingSlug = ref(false);
const isAddingMember = ref(false);
const isLoadingMembers = ref(false);
const isDeleting = ref(false);

const editForm = reactive<OrganizationLocalizationFormState>({
  displayName: "",
  description: "",
  imagePath: "",
  websiteUrl: "",
  setAsDefault: false,
});

const selectedOrganization = computed(() => props.selectedOrganization);

const organizationOptions = computed<Array<SelectOption<string>>>(() =>
  props.organizationList.map((organization) => ({
    label: `${organization.name} (${organization.slug})`,
    value: organization.slug,
  }))
);

const selectedOrganizationSlugSelectModel = computed<ZKSelectModel>({
  get: () => props.selectedOrganizationSlug ?? null,
  set: (value) => {
    const organizationSlug =
      typeof value === "string" && value.length > 0 ? value : undefined;
    setSelectedOrganizationSlug(organizationSlug);
  },
});

const localizedLanguageOptions = computed(
  (): Array<SelectOption<SupportedDisplayLanguageCodes>> => {
    const organization = selectedOrganization.value;
    const localizedLanguageCodes = new Set(
      organization?.localizations.map(
        (localization) => localization.languageCode
      ) ?? []
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
  () =>
    selectedLanguageCode.value ===
    selectedOrganization.value?.defaultLanguageCode
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

const canSaveOrganization = computed(() => {
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
});

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
  () => props.selectedOrganizationSlug,
  () => {
    organizationMembers.value = [];
    hasLoadedMembers.value = false;
    showSlugConfirmDialog.value = false;
  },
  { immediate: true }
);

watch(
  selectedOrganization,
  (organization) => {
    if (organization === undefined) {
      return;
    }

    selectedLanguageCode.value = organization.defaultLanguageCode;
    selectedOrganizationSlugDraft.value = organization.slug;
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

function setSelectedOrganizationSlug(
  organizationSlug: string | undefined
): void {
  emit("update:selectedOrganizationSlug", organizationSlug);
  showDeleteConfirmDialog.value = false;
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
  if (
    organization === undefined ||
    !canSaveOrganization.value ||
    isSaving.value
  ) {
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
    emit("saved", { refreshSelectedDetails: false });
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
  if (
    organization === undefined ||
    removingMemberUsername.value !== undefined
  ) {
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

function deleteButtonClicked(): void {
  const organization = selectedOrganization.value;
  if (organization === undefined || isDeleting.value) {
    return;
  }

  showDeleteConfirmDialog.value = true;
}

async function confirmDeleteOrganization(): Promise<void> {
  const organization = selectedOrganization.value;
  if (organization === undefined || isDeleting.value) {
    return;
  }

  isDeleting.value = true;
  const success = await deleteOrganization({
    organizationName: organization.slug,
  });
  isDeleting.value = false;

  if (success) {
    showDeleteConfirmDialog.value = false;
    emit("deleted");
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

.headerSelect {
  margin-top: 1rem;
}

.localizationSection {
  margin-top: 1rem;
}

.badgeRow,
.actionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.badgeRow {
  margin-top: 1rem;
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

.dangerZoneCard {
  margin-top: 1rem;
  overflow: hidden;
  border: 1px solid rgba($negative, 0.35);
}

.dangerZoneTitle {
  padding: 1rem 1rem 0.75rem;
  color: $negative;
  font-size: 1.15rem;
  font-weight: var(--font-weight-semibold);
}

.dangerZoneRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid rgba($negative, 0.22);
}

.dangerZoneContent {
  min-width: 0;
  flex: 1;
}

.dangerZoneRowTitle {
  font-weight: var(--font-weight-semibold);
}

.dangerZoneDescription {
  margin-top: 0.25rem;
  color: $color-text-weak;
  line-height: 1.35;
}

.dangerZoneInput {
  max-width: 28rem;
  margin-top: 0.75rem;
}

.dangerZoneAction {
  flex: 0 0 auto;
}

@media (max-width: 600px) {
  .dangerZoneRow {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
