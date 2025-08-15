<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
        <template #middle>{{
          t("settings.language.spokenLanguages.title")
        }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <!-- Selected Languages Section -->
      <div v-if="selectedLanguages.length > 0" class="settings-section">
        <h3 class="section-title">
          {{ t("settings.language.spokenLanguages.selectedLanguages") }}
        </h3>
        <div class="settings-background">
          <SettingsMenuItem
            v-for="(language, index) in selectedLanguages"
            :key="language.code"
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
            <template #left>
              <div class="language-content">
                <div class="language-name">{{ language.name }}</div>
                <div class="language-english">{{ language.englishName }}</div>
              </div>
            </template>

            <template #right>
              <div class="action-container">
                <ZKIcon color="#FF3B30" name="mdi-minus-circle" size="1.5rem" />
              </div>
            </template>
          </SettingsMenuItem>
        </div>
      </div>

      <!-- Search and Add Languages Section -->
      <div class="settings-section">
        <h3 class="section-title">
          {{
            selectedLanguages.length > 0
              ? t("settings.language.spokenLanguages.addMoreLanguages")
              : t("settings.language.spokenLanguages.selectLanguages")
          }}
        </h3>

        <!-- Search Input -->
        <div class="search-container">
          <SettingsSearchInput
            v-model="searchQuery"
            :placeholder="
              t('settings.language.spokenLanguages.searchLanguages')
            "
          />
        </div>

        <!-- Available Languages -->
        <div
          v-if="filteredAvailableLanguages.length > 0"
          class="settings-background"
        >
          <SettingsMenuItem
            v-for="(language, index) in filteredAvailableLanguages"
            :key="language.code"
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
            <template #left>
              <div class="language-content">
                <div class="language-name">{{ language.name }}</div>
                <div class="language-english">{{ language.englishName }}</div>
              </div>
            </template>

            <template #right>
              <div class="action-container">
                <ZKIcon color="#007AFF" name="mdi-plus-circle" size="1.5rem" />
              </div>
            </template>
          </SettingsMenuItem>
        </div>

        <!-- No Results -->
        <div
          v-else-if="searchQuery && availableLanguages.length > 0"
          class="no-results"
        >
          <ZKIcon name="mdi-magnify" size="2rem" color="#999" />
          <div class="no-results-text">
            {{ t("settings.language.spokenLanguages.noLanguagesFound") }}
          </div>
        </div>

        <!-- All Languages Selected -->
        <div v-else-if="availableLanguages.length === 0" class="no-results">
          <ZKIcon name="mdi-check-all" size="2rem" color="#007AFF" />
          <div class="no-results-text">
            {{ t("settings.language.spokenLanguages.allLanguagesSelected") }}
          </div>
        </div>
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import type { ComputedRef } from "vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import SettingsMenuItem from "src/components/settings/SettingsMenuItem.vue";
import SettingsSearchInput from "src/components/settings/SettingsSearchInput.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useLanguageStore } from "src/stores/language";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotify } from "src/utils/ui/notify";
import type {
  SupportedSpokenLanguageCodes,
  LanguageMetadata,
} from "src/shared/languages";
import {
  getSpokenLanguages,
  searchLanguages,
  sortLanguagesByEnglishName,
  getLanguageByCode,
} from "src/utils/language";
import { computed, onMounted, ref } from "vue";

const { t } = useI18n();
const languageStore = useLanguageStore();
const { spokenLanguages } = storeToRefs(languageStore);
const { updateSpokenLanguages, loadLanguagePreferencesFromBackend } =
  languageStore;

const authStore = useAuthenticationStore();
const { showNotifyMessage } = useNotify();

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

// Add a language to the selection
async function addLanguage(
  languageCode: SupportedSpokenLanguageCodes
): Promise<void> {
  if (spokenLanguages.value.includes(languageCode)) {
    return; // Already selected
  }

  const newLanguages = [...spokenLanguages.value, languageCode];
  await saveLanguageChanges(newLanguages);
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
    showNotifyMessage(
      t("settings.language.spokenLanguages.cannotRemoveLastLanguage")
    );
    return;
  }

  const newLanguages = spokenLanguages.value.filter(
    (code) => code !== languageCode
  );
  await saveLanguageChanges(newLanguages);
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
    // Error handling is now managed by the composable
    // Only show additional error message for critical failures
    if (err instanceof Error) {
      showNotifyMessage(
        t("settings.language.spokenLanguages.failedToSaveLanguages")
      );
    }
  } finally {
    isSaving.value = false;
  }
}

// Load user's spoken language preferences on page mount
onMounted(async () => {
  // If authenticated, sync with backend
  if (authStore.isLoggedIn) {
    try {
      await loadLanguagePreferencesFromBackend();
    } catch (err) {
      console.error("Failed to load spoken languages from backend:", err);
      showNotifyMessage(
        t("settings.language.spokenLanguages.failedToLoadLanguages")
      );
    }
  }
});
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.settings-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
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

.language-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.language-name {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.4;
}

.language-english {
  font-size: 14px;
  color: #666;
  line-height: 1.3;
  font-weight: 400;
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

.cursor-pointer {
  cursor: pointer;
}
</style>
