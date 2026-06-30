<template>
  <ZKSearchableBottomSheetSelect
    v-model="selectedLanguage"
    variant="pill"
    :label="t('languageLabel')"
    :dialog-title="t('languageDialogTitle')"
    :search-placeholder="t('languageSearchPlaceholder')"
    :no-results-label="t('languageNoResults')"
    search-mode="always"
    :options="displayLanguageOptions"
    :text-direction="textDirection"
  />
</template>

<script setup lang="ts">
import ZKSearchableBottomSheetSelect from "src/components/ui-library/ZKSearchableBottomSheetSelect.vue";
import type { LanguageTextDirection } from "src/shared/languages";
import { computed } from "vue";

import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectLanguageOption } from "./projectPageTypes";

const props = defineProps<{
  languageOptions: readonly ProjectLanguageOption[];
  textDirection: LanguageTextDirection;
}>();

const selectedLanguage = defineModel<string | readonly string[]>(
  "selectedLanguage",
  {
    required: true,
  }
);

const selectedLanguageValue = computed(() => {
  if (Array.isArray(selectedLanguage.value)) {
    return selectedLanguage.value.at(0) ?? "en";
  }

  return selectedLanguage.value;
});

const displayLanguageOptions = computed<readonly ProjectLanguageOption[]>(
  () => {
    const seenLanguageCodes = new Set<string>();
    const options: ProjectLanguageOption[] = [];

    for (const option of props.languageOptions) {
      if (seenLanguageCodes.has(option.value)) {
        continue;
      }

      seenLanguageCodes.add(option.value);
      options.push(toDisplayLanguageOption(option));
    }

    return options;
  }
);

function toDisplayLanguageOption(
  option: ProjectLanguageOption
): ProjectLanguageOption {
  return {
    label: option.label,
    value: option.value,
    caption: option.projectSupported
      ? t("languageSupportedByProject")
      : undefined,
    searchText: option.searchText,
  };
}

function t(key: keyof ProjectPageTranslations): string {
  return translateProjectPageText({
    languageCode: selectedLanguageValue.value,
    key,
  });
}
</script>
