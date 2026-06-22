<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="t('languagesTitle')"
      :subtitle="overviewSubtitle"
    >
      <div class="language-settings-list">
        <button
          type="button"
          class="language-settings-row"
          @click="openPrimaryPage"
        >
          <span class="language-settings-row__content">
            <span class="language-settings-row__title">{{
              t("primaryLanguageTitle")
            }}</span>
            <span class="language-settings-row__value">{{
              primaryLanguageLabel
            }}</span>
          </span>
          <q-icon :name="forwardIcon" class="language-settings-row__icon" />
        </button>

        <button
          type="button"
          class="language-settings-row"
          :class="{
            'language-settings-row--disabled': !canUseDynamicTranslation,
          }"
          :disabled="!canUseDynamicTranslation"
          @click="openAdditionalLanguagesPage"
        >
          <span class="language-settings-row__content">
            <span class="language-settings-row__title">{{
              t("additionalLanguagesTitle")
            }}</span>
            <span class="language-settings-row__value">{{
              additionalLanguagesValue
            }}</span>
            <span
              v-if="
                canUseDynamicTranslation &&
                multilingualSetting.additionalLanguageCodes.length === 0
              "
              class="language-settings-row__description"
            >
              {{ t("additionalLanguagesEmptyDescription") }}
            </span>
          </span>
          <q-icon
            :name="canUseDynamicTranslation ? forwardIcon : 'mdi-lock-outline'"
            class="language-settings-row__icon"
          />
        </button>

        <button
          type="button"
          class="language-settings-row"
          :class="{
            'language-settings-row--disabled': !canUseDynamicTranslation,
          }"
          :disabled="!canUseDynamicTranslation"
          @click="toggleDynamicTranslation"
        >
          <span class="language-settings-row__content">
            <span class="language-settings-row__title">{{
              t("dynamicTranslationTitle")
            }}</span>
            <span class="language-settings-row__description">
              {{ t("dynamicTranslationDescription") }}
            </span>
          </span>
          <span class="language-settings-row__actions" @click.stop>
            <q-icon
              v-if="!canUseDynamicTranslation"
              name="mdi-lock-outline"
              class="language-settings-row__icon"
            />
            <q-toggle
              v-else
              :model-value="
                canUseDynamicTranslation &&
                multilingualSetting.dynamicTranslationEnabled
              "
              @update:model-value="setDynamicTranslation"
            />
          </span>
        </button>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <q-dialog v-model="showPrimaryDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="t('primaryLanguageTitle')"
      :subtitle="t('primaryLanguageDescription')"
    >
      <template #leadingAction>
        <ZKBottomDialogBackButton @click="goBackFromPrimary" />
      </template>

      <div class="language-settings-list">
        <button
          v-for="option in primaryLanguageOptions"
          :key="option.value"
          type="button"
          class="language-settings-row"
          :class="{
            'language-settings-row--selected':
              primarySelectedValue === option.value,
            'language-settings-row--disabled': option.disabled === true,
          }"
          :disabled="option.disabled === true"
          @click="handlePrimaryOptionSelected(option)"
        >
          <span class="language-settings-row__content">
            <span class="language-settings-row__title">{{ option.title }}</span>
            <span class="language-settings-row__description">{{
              option.description
            }}</span>
          </span>
          <q-icon
            v-if="primarySelectedValue === option.value"
            name="mdi-check"
            class="language-settings-row__icon language-settings-row__icon--selected"
          />
          <q-icon
            v-else-if="option.value === 'manual'"
            :name="forwardIcon"
            class="language-settings-row__icon"
          />
        </button>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <q-dialog v-model="showLanguagePickerDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="languagePickerTitle"
      :subtitle="languagePickerSubtitle"
    >
      <template #leadingAction>
        <ZKBottomDialogBackButton @click="goBackFromLanguagePicker" />
      </template>

      <div class="language-picker-page">
        <div class="language-search-wrapper">
          <div @keydown.enter.prevent="selectFirstFilteredLanguage">
            <q-input
              :model-value="searchQuery"
              outlined
              dense
              clearable
              autofocus
              :placeholder="t('languageSearchPlaceholder')"
              @update:model-value="updateSearchQuery"
            >
              <template #prepend>
                <q-icon name="mdi-magnify" />
              </template>
            </q-input>
          </div>
        </div>

        <q-list class="language-picker-list" separator>
          <q-item
            v-for="language in filteredLanguageOptions"
            :key="language.value"
            clickable
            :active="isLanguageSelected(language.value)"
            active-class="language-picker-item--active"
            :disable="isLanguageOptionDisabled(language.value)"
            class="language-picker-item"
            @click="selectLanguage(language.value)"
          >
            <q-item-section>
              <q-item-label class="language-picker-item__label">{{
                language.label
              }}</q-item-label>
              <q-item-label caption class="language-picker-item__caption">{{
                language.caption
              }}</q-item-label>
            </q-item-section>
            <q-item-section v-if="isLanguageSelected(language.value)" side>
              <q-icon name="mdi-check" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import ZKBottomDialogBackButton from "src/components/ui-library/ZKBottomDialogBackButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type DisplayLanguageMetadata,
  type LanguageMetadata,
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
  SupportedSpokenLanguageMetadataList,
} from "src/shared/languages";
import type {
  ConversationLanguageSettingInput,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

import {
  type ConversationLanguageSettingDialogTranslations,
  conversationLanguageSettingDialogTranslations,
} from "./ConversationLanguageSettingDialog.i18n";

type LanguageDialogPage =
  | "overview"
  | "primary"
  | "manual-language"
  | "additional-languages";

interface DialogOption {
  title: string;
  description: string;
  value: string;
  disabled?: boolean;
}

interface LanguageOption {
  label: string;
  caption: string;
  searchText: string;
  value: SupportedDisplayLanguageCodes;
}

const props = defineProps<{
  canEditPrimaryLanguage: boolean;
  canUseDynamicTranslation: boolean;
  detectedLanguageCode?: SupportedDisplayLanguageCodes | null;
  detectedSourceLanguageCode?: SupportedSpokenLanguageCodes | null;
  detectedRawLanguageCode?: string | null;
}>();

const showDialog = defineModel<boolean>("showDialog", { required: true });
const languageSetting = defineModel<ConversationLanguageSettingInput>(
  "languageSetting",
  { required: true }
);
const multilingualSetting = defineModel<ConversationMultilingualSetting>(
  "multilingualSetting",
  { required: true }
);

const { t } = useComponentI18n<ConversationLanguageSettingDialogTranslations>(
  conversationLanguageSettingDialogTranslations
);
const $q = useQuasar();

const currentPage = ref<LanguageDialogPage>("overview");
const showPrimaryDialog = ref(false);
const showLanguagePickerDialog = ref(false);
const searchQuery = ref("");

function isDisplayLanguageMetadata(
  language: LanguageMetadata
): language is DisplayLanguageMetadata {
  return language.displaySupported;
}

const languageOptions: LanguageOption[] =
  SupportedSpokenLanguageMetadataList.filter(isDisplayLanguageMetadata).map(
    (language) => ({
      label: language.englishName,
      caption: language.name,
      searchText: `${language.englishName} ${language.name}`,
      value: language.code,
    })
  );

const primaryLanguageLabel = computed(() => {
  if (languageSetting.value.mode === "auto") {
    return t("autoDetectTitle");
  }

  return getLanguageLabel(languageSetting.value.languageCode);
});

const additionalLanguageOptions = computed(() => {
  if (languageSetting.value.mode === "auto") {
    return languageOptions;
  }

  const primaryLanguageCode = languageSetting.value.languageCode;

  return languageOptions.filter(
    (language) => language.value !== primaryLanguageCode
  );
});

const filteredLanguageOptions = computed(() => {
  const options =
    currentPage.value === "additional-languages"
      ? additionalLanguageOptions.value
      : languageOptions;
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (query.length === 0) {
    return options;
  }

  return options.filter((language) =>
    language.searchText.toLocaleLowerCase().includes(query)
  );
});

const additionalLanguagesValue = computed(() => {
  const additionalLanguageLabels =
    multilingualSetting.value.additionalLanguageCodes
      .map(getLanguageLabel)
      .filter((label) => label.length > 0);

  return additionalLanguageLabels.length === 0
    ? t("additionalLanguagesNone")
    : additionalLanguageLabels.join(", ");
});

const overviewSubtitle = computed(() => t("languagesDescription"));

const languagePickerTitle = computed(() =>
  currentPage.value === "manual-language"
    ? t("manualLanguageDialogTitle")
    : t("additionalLanguagesTitle")
);

const languagePickerSubtitle = computed(() =>
  currentPage.value === "manual-language"
    ? t("manualLanguageDescription")
    : t("additionalLanguagesDescription")
);

const primarySelectedValue = computed(() => languageSetting.value.mode);
const forwardIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);
type AutoDetectDescriptionState =
  | { kind: "neutral" }
  | { kind: "unknown" }
  | { kind: "detected"; languageLabel: string }
  | { kind: "unsupported"; languageLabel: string };

function getIntlLanguageLabel(languageCode: string): string | undefined {
  const trimmedLanguageCode = languageCode.trim().replaceAll("_", "-");
  if (trimmedLanguageCode.length === 0) {
    return undefined;
  }

  try {
    const canonicalLanguageCode = Intl.getCanonicalLocales(trimmedLanguageCode).at(0);
    if (canonicalLanguageCode === undefined) {
      return undefined;
    }
    const displayName = new Intl.DisplayNames(["en"], {
      type: "language",
      fallback: "none",
    }).of(canonicalLanguageCode);
    if (displayName === undefined) {
      return undefined;
    }
    return displayName;
  } catch {
    return undefined;
  }
}

function getAutoDetectDescriptionState({
  detectedLanguageCode,
  detectedSourceLanguageCode,
  detectedRawLanguageCode,
}: {
  detectedLanguageCode: SupportedDisplayLanguageCodes | null | undefined;
  detectedSourceLanguageCode: SupportedSpokenLanguageCodes | null | undefined;
  detectedRawLanguageCode: string | null | undefined;
}): AutoDetectDescriptionState {
  if (detectedLanguageCode !== null && detectedLanguageCode !== undefined) {
    return {
      kind: "detected",
      languageLabel: getLanguageLabel(detectedLanguageCode),
    };
  }

  if (detectedSourceLanguageCode !== null && detectedSourceLanguageCode !== undefined) {
    return {
      kind: "unsupported",
      languageLabel: getLanguageLabel(detectedSourceLanguageCode),
    };
  }

  if (detectedRawLanguageCode !== null && detectedRawLanguageCode !== undefined) {
    const rawLanguageLabel = getIntlLanguageLabel(detectedRawLanguageCode);
    if (rawLanguageLabel !== undefined) {
      return { kind: "unsupported", languageLabel: rawLanguageLabel };
    }
  }

  if (
    detectedLanguageCode === undefined &&
    detectedSourceLanguageCode === undefined &&
    detectedRawLanguageCode === undefined
  ) {
    return { kind: "neutral" };
  }

  return { kind: "unknown" };
}

const autoDetectDescriptionState = computed(() =>
  getAutoDetectDescriptionState({
    detectedLanguageCode: props.detectedLanguageCode,
    detectedSourceLanguageCode: props.detectedSourceLanguageCode,
    detectedRawLanguageCode: props.detectedRawLanguageCode,
  })
);
const autoDetectOptionDescription = computed(() => {
  const state = autoDetectDescriptionState.value;
  if (state.kind === "neutral") {
    return t("autoDetectDescription");
  }
  if (state.kind === "unknown") {
    return t("autoDetectUnknownDescription");
  }
  if (state.kind === "unsupported") {
    return t("autoDetectUnsupportedDescription", {
      language: state.languageLabel,
    });
  }
  return t("autoDetectDetectedDescription", {
    language: state.languageLabel,
  });
});
const manualLanguageOptionDescription = computed(() =>
  languageSetting.value.mode === "manual"
    ? getLanguageLabel(languageSetting.value.languageCode)
    : t("manualOptionDescription")
);

const primaryLanguageOptions = computed<DialogOption[]>(() => [
  {
    title: t("autoDetectTitle"),
    description: autoDetectOptionDescription.value,
    value: "auto",
    disabled: !props.canEditPrimaryLanguage,
  },
  {
    title: t("manualTitle"),
    description: manualLanguageOptionDescription.value,
    value: "manual",
    disabled: !props.canEditPrimaryLanguage,
  },
]);

function getLanguageLabel(
  languageCode:
    | SupportedDisplayLanguageCodes
    | SupportedSpokenLanguageCodes
    | null
    | undefined
): string {
  if (languageCode === null || languageCode === undefined) {
    return "";
  }
  return (
    SupportedSpokenLanguageMetadataList.find((language) => language.code === languageCode)
      ?.englishName ?? getIntlLanguageLabel(languageCode) ?? languageCode
  );
}

function openPrimaryPage(): void {
  currentPage.value = "primary";
  showDialog.value = false;
  showPrimaryDialog.value = true;
}

function openAdditionalLanguagesPage(): void {
  if (!props.canUseDynamicTranslation) {
    return;
  }

  currentPage.value = "additional-languages";
  searchQuery.value = "";
  showDialog.value = false;
  showLanguagePickerDialog.value = true;
}

function handlePrimaryOptionSelected(option: DialogOption): void {
  if (option.disabled === true) {
    return;
  }

  if (option.value === "auto") {
    languageSetting.value = { mode: "auto" };
    showPrimaryDialog.value = false;
    return;
  }

  if (option.value === "manual") {
    currentPage.value = "manual-language";
    searchQuery.value = "";
    showPrimaryDialog.value = false;
    showLanguagePickerDialog.value = true;
  }
}

function isLanguageSelected(
  languageCode: SupportedDisplayLanguageCodes
): boolean {
  if (currentPage.value === "manual-language") {
    return (
      languageSetting.value.mode === "manual" &&
      languageSetting.value.languageCode === languageCode
    );
  }

  return multilingualSetting.value.additionalLanguageCodes.includes(
    languageCode
  );
}

function isLanguageOptionDisabled(
  languageCode: SupportedDisplayLanguageCodes
): boolean {
  return (
    currentPage.value === "additional-languages" &&
    multilingualSetting.value.additionalLanguageCodes.length >= 2 &&
    !multilingualSetting.value.additionalLanguageCodes.includes(languageCode)
  );
}

function selectLanguage(languageCode: SupportedDisplayLanguageCodes): void {
  if (isLanguageOptionDisabled(languageCode)) {
    return;
  }

  if (currentPage.value === "manual-language") {
    languageSetting.value = { mode: "manual", languageCode };
    removeAdditionalLanguage(languageCode);
    showLanguagePickerDialog.value = false;
    return;
  }

  if (!props.canUseDynamicTranslation) {
    return;
  }

  if (
    multilingualSetting.value.additionalLanguageCodes.includes(languageCode)
  ) {
    removeAdditionalLanguage(languageCode);
    return;
  }

  multilingualSetting.value = {
    ...multilingualSetting.value,
    additionalLanguageCodes: [
      ...multilingualSetting.value.additionalLanguageCodes,
      languageCode,
    ].slice(0, 2),
  };
}

function removeAdditionalLanguage(
  languageCode: SupportedDisplayLanguageCodes
): void {
  multilingualSetting.value = {
    ...multilingualSetting.value,
    additionalLanguageCodes:
      multilingualSetting.value.additionalLanguageCodes.filter(
        (candidate) => candidate !== languageCode
      ),
  };
}

function toggleDynamicTranslation(): void {
  if (!props.canUseDynamicTranslation) {
    return;
  }

  setDynamicTranslation(!multilingualSetting.value.dynamicTranslationEnabled);
}

function setDynamicTranslation(value: boolean): void {
  if (!props.canUseDynamicTranslation) {
    return;
  }

  multilingualSetting.value = {
    ...multilingualSetting.value,
    dynamicTranslationEnabled: value,
  };
}

function updateSearchQuery(value: string | number | null): void {
  searchQuery.value = String(value ?? "");
}

function selectFirstFilteredLanguage(): void {
  const firstLanguage = filteredLanguageOptions.value.find(
    (language) => !isLanguageOptionDisabled(language.value)
  );

  if (firstLanguage === undefined) {
    return;
  }

  selectLanguage(firstLanguage.value);
}

function goBackFromPrimary(): void {
  currentPage.value = "overview";
  showPrimaryDialog.value = false;
  showDialog.value = true;
}

function goBackFromLanguagePicker(): void {
  const shouldOpenPrimaryDialog = currentPage.value === "manual-language";
  currentPage.value = shouldOpenPrimaryDialog ? "primary" : "overview";
  showLanguagePickerDialog.value = false;
  if (shouldOpenPrimaryDialog) {
    showPrimaryDialog.value = true;
    return;
  }
  showDialog.value = true;
}

watch(
  () => languageSetting.value,
  (setting) => {
    if (setting.mode === "manual") {
      removeAdditionalLanguage(setting.languageCode);
    }
  },
  { deep: true }
);

watch(
  () => props.canUseDynamicTranslation,
  (canUseDynamicTranslation) => {
    if (canUseDynamicTranslation) {
      return;
    }

    multilingualSetting.value = {
      dynamicTranslationEnabled: false,
      additionalLanguageCodes: [],
    };
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.language-settings-list,
.language-picker-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.language-settings-list {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}

.language-settings-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 0;
  background: white;
  color: inherit;
  text-align: start;
  cursor: pointer;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
}

.language-settings-row--disabled {
  cursor: not-allowed;
}

.language-settings-row--selected {
  background: rgba($primary, 0.08);
}

.language-settings-row__content {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
}

.language-settings-row__title {
  color: $color-text-strong;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
}

.language-settings-row__value,
.language-settings-row__description {
  color: $color-text-weak;
  font-size: 0.9rem;
  line-height: 1.3;
}

.language-settings-row__icon {
  flex-shrink: 0;
  color: $color-text-weak;
}

.language-settings-row__icon--selected {
  color: $primary;
}

.language-settings-row__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.language-search-wrapper {
  position: sticky;
  top: 0;
  z-index: 1;
  background: white;
}

.language-picker-list {
  max-height: min(26rem, 46dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}

.language-picker-item {
  min-height: 3.6rem;
  padding-block: 0.75rem;
}

.language-picker-item__label {
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
}

.language-picker-item__caption {
  color: $color-text-weak;
  font-size: 0.9rem;
  line-height: 1.3;
}

.language-picker-item--active {
  background: rgba($primary, 0.08);
  color: $primary;
}
</style>
