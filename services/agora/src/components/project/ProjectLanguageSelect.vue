<template>
  <ZKSearchableBottomSheetSelect
    v-model="selectedLanguage"
    variant="pill"
    :label="t('languageLabel')"
    :dialog-title="t('languageDialogTitle')"
    :search-placeholder="t('languageSearchPlaceholder')"
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

const displayLanguageOptions = computed<readonly ProjectLanguageOption[]>(() =>
  props.languageOptions.map(toDisplayLanguageOption)
);

function toDisplayLanguageOption(
  option: ProjectLanguageOption
): ProjectLanguageOption {
  return {
    label: option.label,
    value: option.value,
    searchText: option.searchText,
    shortLabel: option.shortLabel,
  };
}

function t(key: keyof ProjectPageTranslations): string {
  return translateProjectPageText({
    languageCode: selectedLanguageValue.value,
    key,
  });
}
</script>
