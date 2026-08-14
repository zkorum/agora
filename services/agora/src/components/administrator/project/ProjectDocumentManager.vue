<template>
  <ZKCard padding="1rem" class="document-manager">
    <AdminSectionHeader :title="t('title')" :description="t('description')" />

    <div class="document-manager__warning" role="note">
      <q-icon name="mdi-alert-outline" size="1.4rem" aria-hidden="true" />
      <div>
        <strong>{{ t("publicationWarningTitle") }}</strong>
        <p>{{ t("publicationWarningBody") }}</p>
      </div>
    </div>

    <section class="document-manager__section">
      <AdminSectionHeader
        subsection
        :title="t('chooseFilesTitle')"
        :description="t('chooseFilesDescription')"
      />
      <div class="document-manager__file-grid">
        <ProjectDocumentFilePicker
          v-model="participantFile"
          :label="t('participantFileLabel')"
          :description="t('participantFileHint')"
          :drop-label="t('dropFile')"
          :remove-label="t('removeFile')"
          :accept="PROJECT_DOCUMENT_ACCEPT"
          :max-file-size="MAX_PROJECT_DOCUMENT_FILE_SIZE"
          :disable="isUploading"
          @rejected="showFileError"
        />
        <ProjectDocumentFilePicker
          v-model="ownerFile"
          :label="t('ownerFileLabel')"
          :description="t('ownerFileHint')"
          :drop-label="t('dropFile')"
          :remove-label="t('removeFile')"
          :accept="PROJECT_DOCUMENT_ACCEPT"
          :max-file-size="MAX_PROJECT_DOCUMENT_FILE_SIZE"
          :disable="isUploading"
          @rejected="showFileError"
        />
      </div>
      <p class="document-manager__hint">
        {{ t("allowedFormats", { size: MAX_PROJECT_DOCUMENT_FILE_SIZE_MB }) }}
      </p>
    </section>

    <section class="document-manager__section">
      <AdminSectionHeader
        subsection
        :title="t('detailsTitle')"
        :description="t('detailsDescription')"
      />
      <div class="document-manager__details-grid">
        <q-select
          v-model="defaultLanguageCode"
          outlined
          emit-value
          map-options
          :disable="isUploading"
          :label="t('defaultLanguageLabel')"
          :options="displayLanguageOptions"
        />
        <q-input
          :model-value="defaultName"
          outlined
          :disable="isUploading"
          :maxlength="MAX_LENGTH_TITLE"
          :label="t('nameLabel')"
          @update:model-value="defaultName = String($event ?? '')"
        />
        <q-input
          :model-value="defaultDownloadFileName"
          outlined
          :disable="isUploading"
          maxlength="255"
          :label="t('downloadFileNameLabel')"
          @update:model-value="defaultDownloadFileName = String($event ?? '')"
        />
      </div>

      <div class="document-manager__translations">
        <div class="document-manager__subheading">
          {{ t("additionalNamesTitle") }}
        </div>
        <div
          v-for="(localization, index) in additionalLocalizations"
          :key="localization.languageCode"
          class="document-manager__translation-row"
        >
          <q-select
            :model-value="localization.languageCode"
            outlined
            emit-value
            map-options
            :disable="isUploading"
            :label="t('languageLabel')"
            :options="translationLanguageOptions(localization.languageCode)"
            @update:model-value="
              updateLocalizationLanguage({ index, value: $event })
            "
          />
          <q-input
            :model-value="localization.name"
            outlined
            :disable="isUploading"
            :maxlength="MAX_LENGTH_TITLE"
            :label="t('nameLabel')"
            @update:model-value="
              updateLocalizationName({ index, value: $event })
            "
          />
          <q-input
            :model-value="localization.downloadFileName"
            outlined
            :disable="isUploading"
            maxlength="255"
            :label="t('downloadFileNameLabel')"
            @update:model-value="
              updateLocalizationDownloadFileName({ index, value: $event })
            "
          />
          <q-btn
            flat
            color="negative"
            no-caps
            :disable="isUploading"
            :label="t('remove')"
            @click="removeLocalization(index)"
          />
        </div>
        <q-btn
          outline
          color="primary"
          no-caps
          :disable="isUploading || availableLanguageOptions.length === 0"
          :label="t('addName')"
          @click="addLocalization"
        />
      </div>
    </section>

    <div class="document-manager__actions">
      <p
        v-if="participantFile !== null && uploadValidationError !== undefined"
        class="text-negative"
        role="alert"
      >
        {{ uploadValidationError }}
      </p>
      <q-btn
        color="primary"
        no-caps
        :disable="!canUpload"
        :loading="isUploading"
        :label="t('upload')"
        @click="upload"
      />
    </div>

    <div class="document-manager__results">
      <div v-if="isLoading" class="document-manager__loading">
        <q-spinner color="primary" size="2rem" />
      </div>
      <div v-else-if="hasLoadError" class="document-manager__load-error">
        <span>{{ t("loadFailed") }}</span>
        <q-btn
          flat
          color="primary"
          no-caps
          :label="t('retry')"
          @click="refreshDocuments"
        />
      </div>
      <p v-else-if="documents.length === 0" class="document-manager__empty">
        {{ t("empty") }}
      </p>
      <div v-else class="document-manager__list">
        <div
          v-for="document in documents"
          :key="document.documentId"
          class="document-manager__document"
        >
          <div>
            <div class="document-manager__document-name">
              {{ documentDefaultName(document) }}
            </div>
            <div class="document-manager__document-meta">
              {{ document.participantFile.originalFileName }} ·
              {{ formatFileSize(document.participantFile.byteSize) }}
            </div>
            <div class="document-manager__document-languages">
              {{ document.createdByUsername }} ·
              {{ formatPublishedAt(document.publishedAt) }}
            </div>
            <div
              v-if="document.ownerFile !== undefined"
              class="document-manager__document-languages"
            >
              {{ t("ownerVersionAvailable") }}
            </div>
            <div class="document-manager__document-languages">
              {{
                document.localizations
                  .map((item) => languageLabel(item.languageCode))
                  .join(", ")
              }}
            </div>
          </div>
          <q-btn
            flat
            color="negative"
            no-caps
            :loading="deletingDocumentIds.has(document.documentId)"
            :label="t('remove')"
            :aria-label="`${t('remove')}: ${documentDefaultName(document)}`"
            @click="requestRemoveDocument(document)"
          />
        </div>
      </div>
    </div>

    <ZKConfirmDialog
      v-model="showDeleteConfirmation"
      :title="t('deleteTitle')"
      :message="t('deleteMessage')"
      :confirm-text="t('remove')"
      :cancel-text="t('cancel')"
      variant="destructive"
      @confirm="removePendingDocument"
    />
  </ZKCard>
</template>

<script setup lang="ts">
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import ProjectDocumentFilePicker from "src/components/administrator/project/ProjectDocumentFilePicker.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  getProjectDocumentContentTypeFromFileName,
  getProjectDocumentFileExtension,
  isSafeProjectDocumentFileName,
  MAX_PROJECT_DOCUMENT_FILE_SIZE,
  MAX_PROJECT_DOCUMENT_FILE_SIZE_MB,
  PROJECT_DOCUMENT_ACCEPT,
} from "src/shared/projectDocument";
import { MAX_LENGTH_TITLE } from "src/shared/shared";
import type {
  AdminProjectDocument,
  ProjectDocumentLocalization,
} from "src/shared/types/dto";
import { useBackendAdministratorProjectApi } from "src/utils/api/administrator/project";
import { formatFileSize } from "src/utils/format";
import { useNotify } from "src/utils/ui/notify";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  type ProjectDocumentManagerTranslations,
  projectDocumentManagerTranslations,
} from "./ProjectDocumentManager.i18n";

interface LanguageOption {
  label: string;
  value: SupportedDisplayLanguageCodes;
}

const props = defineProps<{
  projectSlug: string;
  displayLanguageOptions: readonly LanguageOption[];
}>();

const { t } = useComponentI18n<ProjectDocumentManagerTranslations>(
  projectDocumentManagerTranslations
);
const { showNotifyMessage } = useNotify();
const { deleteProjectDocument, listProjectDocuments, uploadProjectDocument } =
  useBackendAdministratorProjectApi();

const documents = ref<AdminProjectDocument[]>([]);
const participantFile = ref<File | null>(null);
const ownerFile = ref<File | null>(null);
const defaultLanguageCode = ref<SupportedDisplayLanguageCodes>("en");
const defaultName = ref("");
const defaultDownloadFileName = ref("");
const additionalLocalizations = ref<ProjectDocumentLocalization[]>([]);
const isLoading = ref(false);
const hasLoadError = ref(false);
const isUploading = ref(false);
const deletingDocumentIds = ref<Set<string>>(new Set());
const pendingDeleteDocument = ref<AdminProjectDocument | undefined>();
const showDeleteConfirmation = ref(false);
const autoDownloadFileName = ref("");
let latestDocumentsRequest = 0;
let isActive = true;

onBeforeUnmount(() => {
  isActive = false;
  latestDocumentsRequest += 1;
});

const usedLanguageCodes = computed(
  () =>
    new Set<SupportedDisplayLanguageCodes>([
      defaultLanguageCode.value,
      ...additionalLocalizations.value.map(
        (localization) => localization.languageCode
      ),
    ])
);
const availableLanguageOptions = computed(() =>
  props.displayLanguageOptions.filter(
    (option) => !usedLanguageCodes.value.has(option.value)
  )
);
const uploadValidationError = computed<string | undefined>(() => {
  const participant = participantFile.value;
  if (
    participant === null ||
    participant.size === 0 ||
    participant.size > MAX_PROJECT_DOCUMENT_FILE_SIZE ||
    getProjectDocumentContentTypeFromFileName(participant.name) === undefined ||
    !isSafeProjectDocumentFileName(participant.name)
  ) {
    return t("invalidFile");
  }
  const participantExtension = getProjectDocumentFileExtension(
    participant.name
  );
  const owner = ownerFile.value;
  if (
    owner !== null &&
    (owner.size === 0 ||
      owner.size > MAX_PROJECT_DOCUMENT_FILE_SIZE ||
      getProjectDocumentContentTypeFromFileName(owner.name) === undefined ||
      !isSafeProjectDocumentFileName(owner.name))
  ) {
    return t("invalidFile");
  }
  if (
    owner !== null &&
    getProjectDocumentFileExtension(owner.name) !== participantExtension
  ) {
    return t("mismatchedFiles");
  }
  const localizations = [
    {
      name: defaultName.value,
      downloadFileName: defaultDownloadFileName.value,
    },
    ...additionalLocalizations.value,
  ];
  if (localizations.some((localization) => localization.name.trim() === "")) {
    return t("invalidName");
  }
  if (
    localizations.some(
      (localization) =>
        getProjectDocumentFileExtension(
          localization.downloadFileName.trim()
        ) !== participantExtension ||
        !isSafeProjectDocumentFileName(localization.downloadFileName)
    )
  ) {
    return t("invalidDownloadFileName");
  }
  return undefined;
});
const canUpload = computed(
  () => !isUploading.value && uploadValidationError.value === undefined
);

watch(
  () => props.projectSlug,
  async () => {
    latestDocumentsRequest += 1;
    pendingDeleteDocument.value = undefined;
    showDeleteConfirmation.value = false;
    resetDraft();
    await refreshDocuments();
  },
  { immediate: true }
);

watch(defaultLanguageCode, (languageCode) => {
  additionalLocalizations.value = additionalLocalizations.value.filter(
    (localization) => localization.languageCode !== languageCode
  );
});

watch(participantFile, (file) => {
  if (file === null) return;
  if (
    defaultDownloadFileName.value.trim() === "" ||
    defaultDownloadFileName.value === autoDownloadFileName.value
  ) {
    defaultDownloadFileName.value = file.name;
  }
  additionalLocalizations.value = additionalLocalizations.value.map(
    (localization) => ({
      ...localization,
      downloadFileName:
        localization.downloadFileName.trim() === "" ||
        localization.downloadFileName === autoDownloadFileName.value
          ? file.name
          : localization.downloadFileName,
    })
  );
  autoDownloadFileName.value = file.name;
});

function languageLabel(languageCode: SupportedDisplayLanguageCodes): string {
  return (
    props.displayLanguageOptions.find((option) => option.value === languageCode)
      ?.label ?? languageCode
  );
}

function translationLanguageOptions(
  currentLanguageCode: SupportedDisplayLanguageCodes
): LanguageOption[] {
  return props.displayLanguageOptions.filter(
    (option) =>
      option.value === currentLanguageCode ||
      !usedLanguageCodes.value.has(option.value)
  );
}

function addLocalization(): void {
  const option = availableLanguageOptions.value.at(0);
  if (option === undefined) return;
  additionalLocalizations.value.push({
    languageCode: option.value,
    name: "",
    downloadFileName: defaultDownloadFileName.value,
  });
}

function updateLocalizationLanguage({
  index,
  value,
}: {
  index: number;
  value: unknown;
}): void {
  const parsed = props.displayLanguageOptions.find(
    (option) => option.value === value
  );
  const localization = additionalLocalizations.value[index];
  if (parsed === undefined || localization === undefined) return;
  additionalLocalizations.value.splice(index, 1, {
    ...localization,
    languageCode: parsed.value,
  });
}

function updateLocalizationName({
  index,
  value,
}: {
  index: number;
  value: string | number | null;
}): void {
  const localization = additionalLocalizations.value[index];
  if (localization === undefined) return;
  additionalLocalizations.value.splice(index, 1, {
    ...localization,
    name: String(value ?? ""),
  });
}

function updateLocalizationDownloadFileName({
  index,
  value,
}: {
  index: number;
  value: string | number | null;
}): void {
  const localization = additionalLocalizations.value[index];
  if (localization === undefined) return;
  additionalLocalizations.value.splice(index, 1, {
    ...localization,
    downloadFileName: String(value ?? ""),
  });
}

function removeLocalization(index: number): void {
  additionalLocalizations.value.splice(index, 1);
}

function documentDefaultName(document: AdminProjectDocument): string {
  return (
    document.localizations.find(
      (localization) =>
        localization.languageCode === document.defaultLanguageCode
    )?.name ?? document.participantFile.originalFileName
  );
}

function formatPublishedAt(publishedAt: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(publishedAt);
}

function showFileError(): void {
  showNotifyMessage(t("invalidFile"));
}

function resetDraft(): void {
  participantFile.value = null;
  ownerFile.value = null;
  defaultName.value = "";
  defaultDownloadFileName.value = "";
  autoDownloadFileName.value = "";
  additionalLocalizations.value = [];
}

async function refreshDocuments(): Promise<void> {
  latestDocumentsRequest += 1;
  const requestId = latestDocumentsRequest;
  const projectSlug = props.projectSlug;
  isLoading.value = true;
  hasLoadError.value = false;
  try {
    const response = await listProjectDocuments({
      projectSlug,
    });
    if (requestId !== latestDocumentsRequest) return;
    documents.value = response.documents;
  } catch (error) {
    console.error(error);
    if (requestId === latestDocumentsRequest) {
      hasLoadError.value = true;
    }
  } finally {
    if (requestId === latestDocumentsRequest) {
      isLoading.value = false;
    }
  }
}

async function upload(): Promise<void> {
  const selectedParticipantFile = participantFile.value;
  if (!canUpload.value || selectedParticipantFile === null) return;
  isUploading.value = true;
  const projectSlug = props.projectSlug;
  try {
    const document = await uploadProjectDocument({
      participantFile: selectedParticipantFile,
      ownerFile: ownerFile.value ?? undefined,
      metadata: {
        projectSlug,
        defaultLanguageCode: defaultLanguageCode.value,
        localizations: [
          {
            languageCode: defaultLanguageCode.value,
            name: defaultName.value.trim(),
            downloadFileName: defaultDownloadFileName.value.trim(),
          },
          ...additionalLocalizations.value.map((localization) => ({
            languageCode: localization.languageCode,
            name: localization.name.trim(),
            downloadFileName: localization.downloadFileName.trim(),
          })),
        ],
      },
    });
    if (isActive && projectSlug === props.projectSlug) {
      documents.value.unshift(document);
      resetDraft();
      showNotifyMessage(t("uploadComplete"));
    }
  } catch (error) {
    console.error(error);
    showNotifyMessage(t("uploadFailed"));
  } finally {
    isUploading.value = false;
  }
}

function requestRemoveDocument(document: AdminProjectDocument): void {
  pendingDeleteDocument.value = document;
  showDeleteConfirmation.value = true;
}

async function removePendingDocument(): Promise<void> {
  const document = pendingDeleteDocument.value;
  if (document === undefined) return;
  const documentId = document.documentId;
  const projectSlug = props.projectSlug;
  deletingDocumentIds.value = new Set([
    ...deletingDocumentIds.value,
    documentId,
  ]);
  try {
    await deleteProjectDocument({
      projectSlug,
      documentId,
    });
    if (isActive && projectSlug === props.projectSlug) {
      documents.value = documents.value.filter(
        (document) => document.documentId !== documentId
      );
      showNotifyMessage(t("deleteComplete"));
      showDeleteConfirmation.value = false;
      pendingDeleteDocument.value = undefined;
    }
  } catch (error) {
    console.error(error);
    showNotifyMessage(t("deleteFailed"));
  } finally {
    const nextDeletingIds = new Set(deletingDocumentIds.value);
    nextDeletingIds.delete(documentId);
    deletingDocumentIds.value = nextDeletingIds;
  }
}
</script>

<style scoped lang="scss">
.document-manager__warning {
  display: flex;
  gap: 0.75rem;
  margin-block-start: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid #f0c36a;
  border-radius: 0.75rem;
  color: #654b12;
  background: #fff8e7;
}

.document-manager__warning p {
  margin: 0.25rem 0 0;
}

.document-manager__section {
  margin-block-start: 1.25rem;
}

.document-manager__section + .document-manager__section {
  margin-block-start: 1.5rem;
  padding-block-start: 1.25rem;
  border-block-start: 1px solid #e9e9f1;
}

.document-manager__file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 1rem;
  margin-block-start: 1rem;
}

.document-manager__details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
  margin-block-start: 1rem;
}

.document-manager__translations {
  display: grid;
  gap: 0.75rem;
  margin-block-start: 1.25rem;
}

.document-manager__subheading,
.document-manager__document-name {
  font-weight: 700;
}

.document-manager__translation-row {
  display: grid;
  grid-template-columns:
    minmax(9rem, 0.5fr) minmax(11rem, 1fr) minmax(11rem, 1fr)
    auto;
  gap: 0.75rem;
  align-items: center;
}

.document-manager__hint,
.document-manager__document-meta,
.document-manager__document-languages,
.document-manager__empty {
  color: #687386;
}

.document-manager__hint {
  margin-block: 0.75rem 0;
}

.document-manager__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-block-start: 1.25rem;
}

.document-manager__actions p,
.document-manager__empty {
  margin: 0;
}

.document-manager__results {
  margin-block-start: 1.25rem;
}

.document-manager__loading {
  display: flex;
  justify-content: center;
  padding-block: 2rem;
}

.document-manager__load-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-block-start: 1rem;
  color: #b42318;
}

.document-manager__list {
  display: grid;
  gap: 0.75rem;
}

.document-manager__document {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  border: 1px solid #dce2ea;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
}

.document-manager__document > div {
  min-width: 0;
}

.document-manager__document-meta,
.document-manager__document-languages {
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .document-manager__translation-row {
    grid-template-columns: 1fr;
  }

  .document-manager__file-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .document-manager__document {
    align-items: flex-start;
  }
}
</style>
