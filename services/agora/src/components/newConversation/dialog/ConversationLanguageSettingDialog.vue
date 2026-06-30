<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="t('languagesTitle')"
      :subtitle="overviewSubtitle"
    >
      <div class="language-settings-list">
        <ConversationLanguageSettingsRow
          :title="t('languagesTitle')"
          :value="selectedLanguagesValue"
          :description="selectedLanguagesDescription"
          :icon="canUseDynamicTranslation ? forwardIcon : 'mdi-lock-outline'"
          :disabled="!canUseDynamicTranslation"
          :clickable="true"
          @click="openAdditionalLanguagesPage"
        />

        <ConversationLanguageSettingsRow
          :title="t('dynamicTranslationTitle')"
          :value="undefined"
          :description="t('dynamicTranslationDescription')"
          :icon="undefined"
          :disabled="!canUseDynamicTranslation"
          :clickable="false"
        >
          <template #actions>
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
          </template>
        </ConversationLanguageSettingsRow>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <ConversationAdditionalLanguagesDialog
    v-model:show-dialog="showLanguagePickerDialog"
    v-model:multilingual-setting="multilingualSetting"
    :can-edit-languages="canUseDynamicTranslation"
    :show-auto-language="showAutoLanguage"
    :auto-language-caption="autoLanguageCaption"
    :detected-language-code="props.detectedLanguageCode"
    @back="goBackFromLanguagePicker"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type {
  AutoLanguageDetectionStatus,
  ConversationLanguageSettingInput,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

import ConversationAdditionalLanguagesDialog from "./ConversationAdditionalLanguagesDialog.vue";
import {
  type ConversationLanguageSettingDialogTranslations,
  conversationLanguageSettingDialogTranslations,
} from "./ConversationLanguageSettingDialog.i18n";
import {
  getLanguageLabel,
  getLocalizedLanguageName,
} from "./conversationLanguageSettings.utils";
import ConversationLanguageSettingsRow from "./ConversationLanguageSettingsRow.vue";

const props = withDefaults(
  defineProps<{
    canUseDynamicTranslation: boolean;
    showAutoLanguage?: boolean;
    detectedLanguageCode?: SupportedDisplayLanguageCodes | null;
    detectedSourceLanguageCode?: SupportedSpokenLanguageCodes | null;
    detectedRawLanguageCode?: string | null;
    autoDetectionStatus?: AutoLanguageDetectionStatus;
  }>(),
  {
    autoDetectionStatus: undefined,
    detectedLanguageCode: undefined,
    detectedRawLanguageCode: undefined,
    detectedSourceLanguageCode: undefined,
    showAutoLanguage: true,
  }
);

const showDialog = defineModel<boolean>("showDialog", { required: true });
const languageSetting = defineModel<ConversationLanguageSettingInput>(
  "languageSetting",
  { required: true }
);
const multilingualSetting = defineModel<ConversationMultilingualSetting>(
  "multilingualSetting",
  { required: true }
);

const { t, locale } =
  useComponentI18n<ConversationLanguageSettingDialogTranslations>(
    conversationLanguageSettingDialogTranslations
  );
const $q = useQuasar();

const showLanguagePickerDialog = ref(false);

const additionalLanguagesValue = computed(() => {
  const additionalLanguageLabels =
    multilingualSetting.value.additionalLanguageCodes
      .map(getDisplayLanguageLabel)
      .filter((label) => label.length > 0);

  return additionalLanguageLabels.join(", ");
});

const overviewSubtitle = computed(() => t("languagesDescription"));

const forwardIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);
type AutoDetectDescriptionState =
  | { kind: "neutral" }
  | { kind: "stable_unknown" }
  | { kind: "retryable_unknown" }
  | { kind: "detected"; languageLabel: string }
  | { kind: "unsupported"; languageLabel: string };

function getAutoDetectDescriptionState({
  detectedLanguageCode,
  detectedSourceLanguageCode,
  detectedRawLanguageCode,
  autoDetectionStatus,
}: {
  detectedLanguageCode: SupportedDisplayLanguageCodes | null | undefined;
  detectedSourceLanguageCode: SupportedSpokenLanguageCodes | null | undefined;
  detectedRawLanguageCode: string | null | undefined;
  autoDetectionStatus: AutoLanguageDetectionStatus | undefined;
}): AutoDetectDescriptionState {
  if (
    autoDetectionStatus === undefined ||
    autoDetectionStatus === "not_attempted"
  ) {
    return { kind: "neutral" };
  }

  if (autoDetectionStatus === "retryable_unknown") {
    return { kind: "retryable_unknown" };
  }

  if (autoDetectionStatus === "stable_unknown") {
    return { kind: "stable_unknown" };
  }

  if (detectedLanguageCode !== null && detectedLanguageCode !== undefined) {
    return {
      kind: "detected",
      languageLabel: getDisplayLanguageLabel(detectedLanguageCode),
    };
  }

  if (
    detectedSourceLanguageCode !== null &&
    detectedSourceLanguageCode !== undefined
  ) {
    return {
      kind: "unsupported",
      languageLabel: getDisplayLanguageLabel(detectedSourceLanguageCode),
    };
  }

  if (
    detectedRawLanguageCode !== null &&
    detectedRawLanguageCode !== undefined
  ) {
    const rawLanguageLabel = getLocalizedLanguageName({
      languageCode: detectedRawLanguageCode,
      locale: locale.value,
    });
    if (rawLanguageLabel !== undefined) {
      return { kind: "unsupported", languageLabel: rawLanguageLabel };
    }
  }

  return { kind: "stable_unknown" };
}

const autoDetectDescriptionState = computed(() =>
  getAutoDetectDescriptionState({
    detectedLanguageCode: props.detectedLanguageCode,
    detectedSourceLanguageCode: props.detectedSourceLanguageCode,
    detectedRawLanguageCode: props.detectedRawLanguageCode,
    autoDetectionStatus: props.autoDetectionStatus,
  })
);
const autoLanguageValue = computed(() => {
  const state = autoDetectDescriptionState.value;
  if (state.kind === "detected") {
    return `${t("languageAutoLabel")} (${t("autoDetectDetectedDescription", {
      language: state.languageLabel,
    })})`;
  }
  return t("languageAutoLabel");
});

const autoLanguageCaption = computed(() => {
  const state = autoDetectDescriptionState.value;
  if (state.kind === "neutral") {
    return t("detectedLanguageAfterPublishing");
  }
  if (state.kind === "stable_unknown") {
    return t("autoDetectUnknownDescription");
  }
  if (state.kind === "retryable_unknown") {
    return t("autoDetectRetryableUnknownDescription");
  }
  if (state.kind === "detected") {
    return t("autoDetectDetectedDescription", {
      language: state.languageLabel,
    });
  }
  return t("autoDetectUnsupportedDescription", {
    language: state.languageLabel,
  });
});

const selectedLanguagesValue = computed(() => {
  const values = props.showAutoLanguage ? [autoLanguageValue.value] : [];
  if (additionalLanguagesValue.value.length > 0) {
    values.push(additionalLanguagesValue.value);
  }
  const value = values.join(", ");
  return value.length === 0 ? undefined : value;
});

const selectedLanguagesDescription = computed(() => {
  return t("additionalLanguagesEmptyDescription");
});

function getDisplayLanguageLabel(
  languageCode:
    | SupportedDisplayLanguageCodes
    | SupportedSpokenLanguageCodes
    | null
    | undefined
): string {
  return getLanguageLabel({ languageCode, locale: locale.value });
}

function openAdditionalLanguagesPage(): void {
  if (!props.canUseDynamicTranslation) {
    return;
  }

  showDialog.value = false;
  showLanguagePickerDialog.value = true;
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

function setDynamicTranslation(value: boolean): void {
  if (!props.canUseDynamicTranslation) {
    return;
  }

  multilingualSetting.value = {
    ...multilingualSetting.value,
    dynamicTranslationEnabled: value,
  };
}

function goBackFromLanguagePicker(): void {
  showLanguagePickerDialog.value = false;
  showDialog.value = true;
}

watch(
  () => props.detectedLanguageCode,
  (detectedLanguageCode) => {
    if (detectedLanguageCode !== null && detectedLanguageCode !== undefined) {
      removeAdditionalLanguage(detectedLanguageCode);
    }
  },
  { immediate: true }
);

watch(
  () => languageSetting.value.mode,
  (mode) => {
    if (mode !== "auto") {
      languageSetting.value = { mode: "auto" };
    }
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
.language-settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}

</style>
