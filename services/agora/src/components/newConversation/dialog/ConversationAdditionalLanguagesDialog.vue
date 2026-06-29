<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="t('languagesTitle')"
      :subtitle="t('additionalLanguagesDescription')"
    >
      <template #leadingAction>
        <ZKBottomDialogBackButton @click="emit('back')" />
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
            v-if="props.showAutoLanguage"
            :active="true"
            :disable="true"
            active-class="language-picker-item--active"
            class="language-picker-item"
          >
            <q-item-section>
              <q-item-label class="language-picker-item__label">{{
                t("languageAutoLabel")
              }}</q-item-label>
              <q-item-label caption class="language-picker-item__caption">{{
                props.autoLanguageCaption
              }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="mdi-check" color="primary" />
            </q-item-section>
          </q-item>

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
import ZKBottomDialogBackButton from "src/components/ui-library/ZKBottomDialogBackButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ConversationMultilingualSetting } from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

import {
  type ConversationLanguageSettingDialogTranslations,
  conversationLanguageSettingDialogTranslations,
} from "./ConversationLanguageSettingDialog.i18n";
import { getLanguageOptions } from "./conversationLanguageSettings.utils";

const props = defineProps<{
  canEditLanguages: boolean;
  showAutoLanguage: boolean;
  autoLanguageCaption: string;
  detectedLanguageCode: SupportedDisplayLanguageCodes | null | undefined;
}>();

const emit = defineEmits<{
  back: [];
}>();

const showDialog = defineModel<boolean>("showDialog", { required: true });
const multilingualSetting = defineModel<ConversationMultilingualSetting>(
  "multilingualSetting",
  { required: true }
);

const { t, locale } =
  useComponentI18n<ConversationLanguageSettingDialogTranslations>(
    conversationLanguageSettingDialogTranslations
  );

const searchQuery = ref("");

const languageOptions = computed(() =>
  getLanguageOptions({ locale: locale.value })
);

const additionalLanguageOptions = computed(() => {
  const detectedLanguageCode = props.detectedLanguageCode;
  if (detectedLanguageCode === null || detectedLanguageCode === undefined) {
    return languageOptions.value;
  }

  return languageOptions.value.filter(
    (language) => language.value !== detectedLanguageCode
  );
});

const filteredLanguageOptions = computed(() => {
  const options = additionalLanguageOptions.value;
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (query.length === 0) {
    return options;
  }

  return options.filter((language) =>
    language.searchText.toLocaleLowerCase().includes(query)
  );
});

function isLanguageSelected(
  languageCode: SupportedDisplayLanguageCodes
): boolean {
  return multilingualSetting.value.additionalLanguageCodes.includes(
    languageCode
  );
}

function isLanguageOptionDisabled(
  languageCode: SupportedDisplayLanguageCodes
): boolean {
  return (
    multilingualSetting.value.additionalLanguageCodes.length >= 2 &&
    !multilingualSetting.value.additionalLanguageCodes.includes(languageCode)
  );
}

function selectLanguage(languageCode: SupportedDisplayLanguageCodes): void {
  if (!props.canEditLanguages || isLanguageOptionDisabled(languageCode)) {
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

watch(
  () => props.detectedLanguageCode,
  (detectedLanguageCode) => {
    if (detectedLanguageCode !== null && detectedLanguageCode !== undefined) {
      removeAdditionalLanguage(detectedLanguageCode);
    }
  },
  { immediate: true }
);

watch(showDialog, (isShown) => {
  if (isShown) {
    searchQuery.value = "";
  }
});
</script>

<style scoped lang="scss">
.language-picker-page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
