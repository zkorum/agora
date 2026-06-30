<template>
  <q-expansion-item class="language-expansion" :label="labels.title" dense-toggle>
    <div class="nested-form">
      <div class="form-grid">
        <q-select
          v-model="languageCode"
          outlined
          emit-value
          map-options
          :label="labels.languageLabel"
          :options="availableLanguageOptions"
        />
        <q-input
          v-model="displayNameInput"
          outlined
          :maxlength="MAX_LENGTH_NAME_CREATOR"
          :label="labels.nameLabel"
        />
        <q-input
          v-model="descriptionInput"
          outlined
          autogrow
          :maxlength="MAX_LENGTH_DESCRIPTION_CREATOR"
          :label="labels.descriptionLabel"
        />
        <q-input
          v-model="websiteUrlInput"
          outlined
          type="url"
          :label="labels.websiteLabel"
        />
        <q-input
          v-model="imagePathInput"
          outlined
          :label="labels.imagePathLabel"
        />
        <q-checkbox
          v-model="isFullImagePath"
          :label="labels.imageIsFullPathLabel"
        />
      </div>
      <q-btn
        class="section-action"
        no-caps
        outline
        color="primary"
        :disable="!canAddLocalization"
        :label="labels.addLanguageButton"
        @click="addLocalization"
      />
      <div v-if="modelValue.length > 0" class="row-list compact-list">
        <div
          v-for="(localization, index) in modelValue"
          :key="localization.languageCode"
          class="summary-row"
        >
          <div>
            <div class="summary-title">
              {{ getLanguageLabel(localization.languageCode) }}
            </div>
            <div class="summary-meta">
              {{ localization.displayName }}
            </div>
          </div>
          <q-btn
            flat
            color="negative"
            no-caps
            :label="labels.removeButton"
            @click="removeLocalization(index)"
          />
        </div>
      </div>
    </div>
  </q-expansion-item>
</template>

<script setup lang="ts">
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import {
  MAX_LENGTH_DESCRIPTION_CREATOR,
  MAX_LENGTH_NAME_CREATOR,
} from "src/shared/shared";
import type { CreateProjectAttributionRequest } from "src/shared/types/dto";
import { computed, type Ref, ref, watch, type WritableComputedRef } from "vue";

type ExternalLocalization = Extract<
  CreateProjectAttributionRequest,
  { source: "external" }
>["additionalLocalizations"][number];

interface DisplayLanguageOption {
  label: string;
  value: SupportedDisplayLanguageCodes;
}

interface ExternalLocalizationEditorLabels {
  title: string;
  languageLabel: string;
  nameLabel: string;
  descriptionLabel: string;
  websiteLabel: string;
  imagePathLabel: string;
  imageIsFullPathLabel: string;
  addLanguageButton: string;
  removeButton: string;
}

const props = defineProps<{
  modelValue: readonly ExternalLocalization[];
  defaultLanguageCode: SupportedDisplayLanguageCodes;
  displayLanguageOptions: readonly DisplayLanguageOption[];
  labels: ExternalLocalizationEditorLabels;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ExternalLocalization[]];
}>();

const languageCode = ref<SupportedDisplayLanguageCodes>(props.defaultLanguageCode);
const displayName = ref("");
const description = ref("");
const websiteUrl = ref("");
const imagePath = ref("");
const isFullImagePath = ref(true);
const displayNameInput = stringInputModel(displayName);
const descriptionInput = stringInputModel(description);
const websiteUrlInput = stringInputModel(websiteUrl);
const imagePathInput = stringInputModel(imagePath);

const usedLanguageCodes = computed(
  () => new Set(props.modelValue.map((localization) => localization.languageCode))
);

const availableLanguageOptions = computed(() =>
  props.displayLanguageOptions.filter(
    (option) =>
      option.value !== props.defaultLanguageCode &&
      !usedLanguageCodes.value.has(option.value)
  )
);

const canAddLocalization = computed(
  () =>
    languageCode.value !== props.defaultLanguageCode &&
    !usedLanguageCodes.value.has(languageCode.value) &&
    displayName.value.trim() !== "" &&
    isOptionalUrlValid(websiteUrl.value)
);

watch(
  () => props.defaultLanguageCode,
  (defaultLanguageCode) => {
    const localizations = props.modelValue.filter(
      (localization) => localization.languageCode !== defaultLanguageCode
    );
    if (localizations.length !== props.modelValue.length) {
      emit("update:modelValue", localizations);
    }
    selectFirstAvailableLanguage();
  }
);

watch(
  availableLanguageOptions,
  (options) => {
    if (options.some((option) => option.value === languageCode.value)) {
      return;
    }

    selectFirstAvailableLanguage();
  },
  { immediate: true }
);

function getLanguageLabel(language: SupportedDisplayLanguageCodes): string {
  return (
    props.displayLanguageOptions.find((option) => option.value === language)
      ?.label ?? language
  );
}

function isOptionalUrlValid(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

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

function selectFirstAvailableLanguage(): void {
  const option = availableLanguageOptions.value[0];
  if (option !== undefined) {
    languageCode.value = option.value;
  }
}

function resetFields(): void {
  displayName.value = "";
  description.value = "";
  websiteUrl.value = "";
  imagePath.value = "";
  isFullImagePath.value = true;
}

function addLocalization(): void {
  if (!canAddLocalization.value) {
    return;
  }

  emit("update:modelValue", [
    ...props.modelValue,
    {
      languageCode: languageCode.value,
      displayName: displayName.value.trim(),
      description: description.value.trim(),
      websiteUrl: optionalString(websiteUrl.value),
      imagePath: optionalString(imagePath.value),
      isFullImagePath: isFullImagePath.value,
    },
  ]);
  resetFields();
}

function removeLocalization(index: number): void {
  const localizations = [...props.modelValue];
  localizations.splice(index, 1);
  emit("update:modelValue", localizations);
}
</script>

<style scoped lang="scss">
.language-expansion {
  border: 1px solid #e9e9f1;
  border-radius: 0.75rem;
}

.nested-form {
  padding: 0 1rem 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.section-action {
  margin-top: 1rem;
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
