<template>
  <q-expansion-item
    class="language-expansion"
    :label="title"
    :caption="description"
    dense-toggle
  >
    <div class="nested-form">
      <p v-if="availableLanguageOptions.length === 0" class="section-description">
        {{ noLanguagesMessage }}
      </p>
      <template v-else>
        <div v-if="availableMachineLocalizations.length > 0" class="machine-list">
          <div
            v-for="machineLocalization in availableMachineLocalizations"
            :key="machineLocalization.languageCode"
            class="machine-card"
          >
            <div class="machine-card__content">
              <div class="summary-title">
                {{ machineTranslationPreviewTitle }} ·
                {{ getLanguageLabel(machineLocalization.languageCode) }}
              </div>
              <div class="summary-meta">{{ machineTranslationPreviewDescription }}</div>
              <div class="machine-card__preview">
                <strong>{{ machineLocalization.projectTitle }}</strong>
                <span v-if="machineLocalization.subtitle !== undefined">
                  {{ machineLocalization.subtitle }}
                </span>
                <span v-if="machineLocalization.bodyPlainText !== undefined">
                  {{ machineLocalization.bodyPlainText }}
                </span>
              </div>
            </div>
            <q-btn
              outline
              no-caps
              color="primary"
              :disable="!isCompleteLocalization(machineLocalization)"
              :label="
                isCompleteLocalization(machineLocalization)
                  ? useMachineTranslationButtonLabel
                  : machineTranslationIncompleteLabel
              "
              @click="startMachineLocalizationDraft(machineLocalization)"
            />
          </div>
        </div>

        <div class="form-grid">
          <q-select
            v-model="draftLanguageCode"
            outlined
            emit-value
            map-options
            :disable="editingLanguageCode !== undefined"
            :label="requiredLabel(languageLabel)"
            :options="availableLanguageOptions"
          />
          <q-input
            v-model="draftTitleInput"
            outlined
            :maxlength="MAX_LENGTH_TITLE"
            :label="requiredLabel(projectTitleLabel)"
          />
          <q-input
            v-model="draftSubtitleInput"
            outlined
            :maxlength="MAX_LENGTH_TITLE"
            :label="subtitleInputLabel"
          />
          <div class="grid-full">
            <ProjectBodyEditor
              v-model="draftBody"
              v-model:plain-text="draftBodyPlainText"
              v-model:is-over-limit="isDraftBodyOverLimit"
              :placeholder="bodyPlaceholder"
              :disabled="false"
            />
          </div>
          <q-input
            v-model="draftBannerPathInput"
            outlined
            :label="optionalLabel(bannerPathLabel)"
          />
          <q-checkbox
            v-model="draftBannerIsFullPath"
            :label="bannerIsFullPathLabel"
          />
        </div>
        <q-btn
          class="section-action"
          no-caps
          outline
          color="primary"
          :disable="!canSaveDraftLocalization"
          :label="editingLanguageCode === undefined ? addButtonLabel : updateButtonLabel"
          @click="saveDraftLocalization"
        />
        <q-btn
          v-if="editingLanguageCode !== undefined"
          class="section-action"
          no-caps
          flat
          color="primary"
          :label="cancelButtonLabel"
          @click="cancelEdit"
        />
      </template>

      <div v-if="localizations.length > 0" class="row-list compact-list">
        <div
          v-for="(localization, index) in localizations"
          :key="localization.languageCode"
          class="summary-row"
        >
          <div>
            <div class="summary-title">
              {{ getLanguageLabel(localization.languageCode) }}
            </div>
            <div class="summary-meta">
              {{ localization.projectTitle }}
            </div>
          </div>
          <q-btn
            flat
            color="primary"
            no-caps
            :label="editButtonLabel"
            @click="editLocalization(localization)"
          />
          <q-btn
            flat
            color="negative"
            no-caps
            :label="removeButtonLabel"
            @click="removeLocalization(index)"
          />
        </div>
      </div>
    </div>
  </q-expansion-item>
</template>

<script setup lang="ts">
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { MAX_LENGTH_TITLE } from "src/shared/shared";
import type { CreateProjectRequest } from "src/shared/types/dto";
import { computed, type Ref, ref, watch, type WritableComputedRef } from "vue";

import ProjectBodyEditor from "./ProjectBodyEditor.vue";

type ProjectContentLocalization =
  CreateProjectRequest["contentLocalizations"][number];

interface LanguageOption {
  label: string;
  value: SupportedDisplayLanguageCodes;
}

const props = defineProps<{
  title: string;
  description: string;
  languageLabel: string;
  projectTitleLabel: string;
  subtitleLabel: string;
  bodyLabel: string;
  bannerPathLabel: string;
  bannerIsFullPathLabel: string;
  addButtonLabel: string;
  updateButtonLabel: string;
  editButtonLabel: string;
  cancelButtonLabel: string;
  removeButtonLabel: string;
  noLanguagesMessage: string;
  machineTranslationPreviewTitle: string;
  machineTranslationPreviewDescription: string;
  useMachineTranslationButtonLabel: string;
  machineTranslationIncompleteLabel: string;
  requiredSuffix: string;
  optionalSuffix: string;
  localizedSubtitleRequired: boolean;
  localizedBodyRequired: boolean;
  targetLanguageCodes: SupportedDisplayLanguageCodes[];
  displayLanguageOptions: LanguageOption[];
  machineLocalizations: ProjectContentLocalization[];
}>();

const localizations = defineModel<ProjectContentLocalization[]>({
  required: true,
});

const draftLanguageCode = ref<SupportedDisplayLanguageCodes>(
  props.displayLanguageOptions[0]?.value ?? "en"
);
const draftTitle = ref("");
const draftSubtitle = ref("");
const draftBody = ref("");
const draftBodyPlainText = ref("");
const isDraftBodyOverLimit = ref(false);
const draftBannerPath = ref("");
const draftBannerIsFullPath = ref(false);
const editingLanguageCode = ref<SupportedDisplayLanguageCodes | undefined>(
  undefined
);

const draftTitleInput = stringInputModel(draftTitle);
const draftSubtitleInput = stringInputModel(draftSubtitle);
const draftBannerPathInput = stringInputModel(draftBannerPath);

const selectedLanguageCodes = computed(
  () =>
    new Set(
      localizations.value
        .filter(
          (localization) => localization.languageCode !== editingLanguageCode.value
        )
        .map((localization) => localization.languageCode)
    )
);

const availableLanguageOptions = computed(() =>
  props.displayLanguageOptions.filter(
    (option) =>
      props.targetLanguageCodes.includes(option.value) &&
      !selectedLanguageCodes.value.has(option.value)
  )
);

const availableMachineLocalizations = computed(() =>
  props.machineLocalizations.filter(
    (localization) =>
      props.targetLanguageCodes.includes(localization.languageCode) &&
      !selectedLanguageCodes.value.has(localization.languageCode)
  )
);

const subtitleInputLabel = computed(() =>
  props.localizedSubtitleRequired
    ? requiredLabel(props.subtitleLabel)
    : optionalLabel(props.subtitleLabel)
);

const bodyPlaceholder = computed(() =>
  props.localizedBodyRequired
    ? requiredLabel(props.bodyLabel)
    : optionalLabel(props.bodyLabel)
);

const canSaveDraftLocalization = computed(
  () =>
    (editingLanguageCode.value !== undefined ||
      availableLanguageOptions.value.some(
        (option) => option.value === draftLanguageCode.value
      )) &&
    draftTitle.value.trim() !== "" &&
    (!props.localizedSubtitleRequired || draftSubtitle.value.trim() !== "") &&
    (!props.localizedBodyRequired || draftBodyPlainText.value.trim() !== "") &&
    !isDraftBodyOverLimit.value
);

watch(
  availableLanguageOptions,
  () => {
    selectFirstAvailableLanguage();
  },
  { immediate: true }
);

function stringInputModel(
  source: Ref<string>
): WritableComputedRef<string | number | null> {
  return computed({
    get: () => source.value,
    set: (value) => {
      source.value = String(value ?? "");
    },
  });
}

function requiredLabel(label: string): string {
  return `${label} (${props.requiredSuffix})`;
}

function optionalLabel(label: string): string {
  return `${label} (${props.optionalSuffix})`;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalRichTextHtml({
  html,
  plainText,
}: {
  html: string;
  plainText: string;
}): string | undefined {
  if (optionalString(plainText) === undefined) {
    return undefined;
  }

  return optionalString(html);
}

function getLanguageLabel(languageCode: SupportedDisplayLanguageCodes): string {
  return (
    props.displayLanguageOptions.find((option) => option.value === languageCode)
      ?.label ?? languageCode
  );
}

function isCompleteLocalization(localization: ProjectContentLocalization): boolean {
  return (
    localization.projectTitle.trim() !== "" &&
    (!props.localizedSubtitleRequired || localization.subtitle?.trim() !== "") &&
    (!props.localizedBodyRequired || localization.bodyPlainText?.trim() !== "")
  );
}

function selectFirstAvailableLanguage(): void {
  const option = availableLanguageOptions.value[0];
  if (option !== undefined) {
    draftLanguageCode.value = option.value;
  }
}

function saveDraftLocalization(): void {
  if (!canSaveDraftLocalization.value) {
    return;
  }

  const nextLocalization = buildDraftLocalization();
  const existingIndex = localizations.value.findIndex(
    (localization) => localization.languageCode === nextLocalization.languageCode
  );
  if (existingIndex === -1) {
    localizations.value = [...localizations.value, nextLocalization];
  } else {
    localizations.value = localizations.value.map((localization, index) =>
      index === existingIndex ? nextLocalization : localization
    );
  }

  resetDraft();
  selectFirstAvailableLanguage();
}

function startMachineLocalizationDraft(
  localization: ProjectContentLocalization
): void {
  if (
    selectedLanguageCodes.value.has(localization.languageCode) ||
    !isCompleteLocalization(localization)
  ) {
    return;
  }

  populateDraft(localization);
}

function buildDraftLocalization(): ProjectContentLocalization {
  return {
    languageCode: draftLanguageCode.value,
    projectTitle: draftTitle.value.trim(),
    subtitle: optionalString(draftSubtitle.value),
    body: optionalRichTextHtml({
      html: draftBody.value,
      plainText: draftBodyPlainText.value,
    }),
    bodyPlainText: optionalString(draftBodyPlainText.value),
    bannerPath: optionalString(draftBannerPath.value),
    bannerIsFullPath: draftBannerIsFullPath.value,
  };
}

function editLocalization(localization: ProjectContentLocalization): void {
  populateDraft(localization);
}

function populateDraft(localization: ProjectContentLocalization): void {
  editingLanguageCode.value = localization.languageCode;
  draftLanguageCode.value = localization.languageCode;
  draftTitle.value = localization.projectTitle;
  draftSubtitle.value = localization.subtitle ?? "";
  draftBody.value = localization.body ?? "";
  draftBodyPlainText.value = localization.bodyPlainText ?? "";
  isDraftBodyOverLimit.value = false;
  draftBannerPath.value = localization.bannerPath ?? "";
  draftBannerIsFullPath.value = localization.bannerIsFullPath;
}

function cancelEdit(): void {
  resetDraft();
  selectFirstAvailableLanguage();
}

function removeLocalization(index: number): void {
  const removedLocalization = localizations.value[index];
  localizations.value = localizations.value.filter(
    (_localization, localizationIndex) => localizationIndex !== index
  );
  if (removedLocalization?.languageCode === editingLanguageCode.value) {
    resetDraft();
  }
  selectFirstAvailableLanguage();
}

function resetDraft(): void {
  editingLanguageCode.value = undefined;
  draftTitle.value = "";
  draftSubtitle.value = "";
  draftBody.value = "";
  draftBodyPlainText.value = "";
  isDraftBodyOverLimit.value = false;
  draftBannerPath.value = "";
  draftBannerIsFullPath.value = false;
}
</script>

<style scoped lang="scss">
.section-description {
  margin: 0 0 1rem;
  color: #5f6368;
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.grid-full {
  grid-column: 1 / -1;
}

.language-expansion {
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.nested-form {
  padding: 0 1rem 1rem;
}

.section-action {
  margin-top: 1rem;
}

.machine-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.machine-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem;
  border: 1px solid #d7e4ff;
  border-radius: 0.75rem;
  background: #f7faff;
}

.machine-card__content {
  min-width: 0;
}

.machine-card__preview {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  max-height: 7.5rem;
  margin-top: 0.5rem;
  overflow: hidden;
  color: #3d4352;
  font-size: 0.9rem;
  line-height: 1.35;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
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
</style>
