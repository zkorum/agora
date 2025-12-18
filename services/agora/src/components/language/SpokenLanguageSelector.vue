<template>
  <div class="spoken-language-selector">
    <!-- Selected Languages Section -->
    <div
      v-if="selectedLanguages.length > 0"
      ref="selectedLanguagesSection"
      class="selector-section"
    >
      <h3 class="section-title">
        {{ t("selectedLanguages") }}
        ({{ selectedLanguages.length }})
      </h3>
      <div class="settings-background">
        <MenuItem
          v-for="(language, index) in selectedLanguages"
          :key="language.code"
          :label="language.name"
          :value="language.englishName"
          :show-separator="index < selectedLanguages.length - 1"
          :border-radius="
            selectedLanguages.length === 1
              ? 'both'
              : index === 0
                ? 'top'
                : index === selectedLanguages.length - 1
                  ? 'bottom'
                  : 'none'
          "
          @click="removeLanguage(language.code)"
        >
          <template #right-icon>
            <ZKIcon
              color="#DC2626"
              name="mdi-minus-circle"
              size="1.5rem"
              class="action-icon"
            />
          </template>
        </MenuItem>
      </div>
    </div>

    <!-- Search and Add Languages Section -->
    <div class="selector-section">
      <h3 class="section-title">
        {{
          selectedLanguages.length > 0
            ? t("addMoreLanguages")
            : t("selectLanguages")
        }}
      </h3>

      <!-- Search Input -->
      <div class="search-container">
        <SettingsSearchInput
          v-model="searchQuery"
          :placeholder="t('searchLanguages')"
        />
      </div>

      <!-- Available Languages -->
      <div
        v-if="filteredAvailableLanguages.length > 0"
        class="settings-background"
      >
        <MenuItem
          v-for="(language, index) in filteredAvailableLanguages"
          :key="language.code"
          :label="language.name"
          :value="language.englishName"
          :show-separator="index < filteredAvailableLanguages.length - 1"
          :border-radius="
            filteredAvailableLanguages.length === 1
              ? 'both'
              : index === 0
                ? 'top'
                : index === filteredAvailableLanguages.length - 1
                  ? 'bottom'
                  : 'none'
          "
          @click="addLanguage(language.code)"
        >
          <template #right-icon>
            <ZKIcon
              color="#6b4eff"
              name="mdi-plus-circle"
              size="1.5rem"
              class="action-icon"
            />
          </template>
        </MenuItem>
      </div>

      <!-- No Results -->
      <div
        v-else-if="searchQuery && availableLanguages.length > 0"
        class="no-results"
      >
        <ZKIcon name="mdi-magnify" size="2rem" color="#999" />
        <div class="no-results-text">
          {{ t("noLanguagesFound") }}
        </div>
      </div>

      <!-- All Languages Selected -->
      <div v-else-if="availableLanguages.length === 0" class="no-results">
        <ZKIcon name="mdi-check-all" size="2rem" color="#007AFF" />
        <div class="no-results-text">
          {{ t("allLanguagesSelected") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import SettingsSearchInput from "src/components/settings/SettingsSearchInput.vue";
import MenuItem from "src/components/ui-library/MenuItem.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  LanguageMetadata,
  SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import {
  getLanguageByCode,
  getSpokenLanguages,
  searchLanguages,
  sortLanguagesByEnglishName,
} from "src/utils/language";
import { useNotify } from "src/utils/ui/notify";
import type { ComputedRef } from "vue";
import { computed, nextTick,onMounted, ref } from "vue";

import {
  type SpokenLanguageSelectorTranslations,
  spokenLanguageSelectorTranslations,
} from "./SpokenLanguageSelector.i18n";

const emit = defineEmits<{
  "language-added": [languageCode: SupportedSpokenLanguageCodes];
  "language-removed": [languageCode: SupportedSpokenLanguageCodes];
  next: [];
}>();

const { t } = useComponentI18n<SpokenLanguageSelectorTranslations>(
  spokenLanguageSelectorTranslations
);

const languageStore = useLanguageStore();
const { spokenLanguages } = storeToRefs(languageStore);
const { updateSpokenLanguages, loadLanguagePreferencesFromBackend } =
  languageStore;

const authStore = useAuthenticationStore();
const { showNotifyMessage } = useNotify();

// Template refs
const selectedLanguagesSection = ref<HTMLElement>();

// Local state
const searchQuery = ref("");
const isSaving = ref(false);

// Get all available spoken languages, sorted by English name
const allSpokenLanguages: ComputedRef<LanguageMetadata[]> = computed(() =>
  sortLanguagesByEnglishName({ langs: getSpokenLanguages() })
);

// Get currently selected languages with metadata
const selectedLanguages: ComputedRef<LanguageMetadata[]> = computed(() => {
  return spokenLanguages.value
    .map((code) => getLanguageByCode(code))
    .filter((lang): lang is LanguageMetadata => lang !== undefined)
    .sort((a, b) => a.englishName.localeCompare(b.englishName));
});

// Get available languages (not yet selected)
const availableLanguages: ComputedRef<LanguageMetadata[]> = computed(() => {
  const selectedCodes = new Set(spokenLanguages.value);
  return allSpokenLanguages.value.filter(
    (lang) => !selectedCodes.has(lang.code)
  );
});

// Filter available languages based on search query
const filteredAvailableLanguages: ComputedRef<LanguageMetadata[]> = computed(
  () => {
    if (!searchQuery.value.trim()) {
      return availableLanguages.value;
    }
    return searchLanguages({
      query: searchQuery.value,
      langs: availableLanguages.value,
    });
  }
);

// Scroll to selected languages section
async function scrollToSelectedLanguages(): Promise<void> {
  await nextTick();
  if (selectedLanguagesSection.value) {
    selectedLanguagesSection.value.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Add a language to the selection
async function addLanguage(
  languageCode: SupportedSpokenLanguageCodes
): Promise<void> {
  if (spokenLanguages.value.includes(languageCode)) {
    return; // Already selected
  }

  const newLanguages = [...spokenLanguages.value, languageCode];
  await saveLanguageChanges(newLanguages);
  emit("language-added", languageCode);

  // Scroll to the selected languages section after adding
  await scrollToSelectedLanguages();
}

// Remove a language from the selection
async function removeLanguage(
  languageCode: SupportedSpokenLanguageCodes
): Promise<void> {
  if (!spokenLanguages.value.includes(languageCode)) {
    return; // Not selected
  }

  // Prevent removing the last language
  if (spokenLanguages.value.length === 1) {
    showNotifyMessage(t("cannotRemoveLastLanguage"));
    return;
  }

  const newLanguages = spokenLanguages.value.filter(
    (code) => code !== languageCode
  );
  await saveLanguageChanges(newLanguages);
  emit("language-removed", languageCode);
}

// Save language changes with proper error handling
async function saveLanguageChanges(
  newLanguages: SupportedSpokenLanguageCodes[]
): Promise<void> {
  if (isSaving.value) return;

  isSaving.value = true;
  try {
    await updateSpokenLanguages({ newLanguages });
  } catch (err: unknown) {
    console.error("Failed to update spoken languages:", err);
    showNotifyMessage(t("failedToSaveLanguages"));
  } finally {
    isSaving.value = false;
  }
}

// Load user's spoken language preferences on mount
onMounted(async () => {
  // If authenticated, sync with backend
  if (authStore.isLoggedIn) {
    try {
      await loadLanguagePreferencesFromBackend();
    } catch (err) {
      console.error("Failed to load spoken languages from backend:", err);
      showNotifyMessage(t("failedToLoadLanguages"));
    }
  }
});

// Expose method for parent components to trigger next action
function handleNext(): void {
  emit("next");
}

defineExpose({
  handleNext,
});
</script>

<style scoped lang="scss">
.spoken-language-selector {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.selector-section {
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: #1a1a1a;
  margin-bottom: 1rem;
  margin-left: 0.5rem;
}

.settings-background {
  background-color: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}

.search-container {
  margin-bottom: 1rem;
}

.language-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.language-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.language-name {
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: #1a1a1a;
  line-height: 1.4;
}

.language-english {
  font-size: 14px;
  color: #666;
  line-height: 1.3;
  font-weight: var(--font-weight-normal);
}

.action-container {
  display: flex;
  align-items: center;
  min-width: 1.5rem;
  justify-content: center;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  background-color: white;
  border-radius: 20px;
}

.no-results-text {
  color: #666;
  font-size: 14px;
  text-align: center;
}
</style>
