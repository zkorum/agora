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
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <div class="container">
      <div class="settings-section">
        <div class="settings-background">
          <MenuItem
            v-for="(language, index) in availableDisplayLanguages"
            :key="language.code"
            :label="language.name"
            :value="language.englishName"
            :show-separator="index < availableDisplayLanguages.length - 1"
            :border-radius="
              availableDisplayLanguages.length === 1
                ? 'both'
                : index === 0
                  ? 'top'
                  : index === availableDisplayLanguages.length - 1
                    ? 'bottom'
                    : 'none'
            "
            @click="selectDisplayLanguage(language.code)"
          >
            <template #right-icon>
              <ZKIcon
                v-if="language.code === displayLanguage"
                color="#007AFF"
                name="mdi-check"
                size="1.5rem"
                class="checkmark-icon"
              />
              <!-- Explicity render nothing by providing an empty div to overwrite the slot -->
              <span></span>
            </template>
          </MenuItem>
        </div>
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import MenuItem from "src/components/ui-library/MenuItem.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type {
  DisplayLanguageMetadata,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { getDisplayLanguages } from "src/utils/language";
import type { ComputedRef } from "vue";
import { computed, onMounted } from "vue";

import {
  type DisplayLanguageSettingsTranslations,
  displayLanguageSettingsTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<DisplayLanguageSettingsTranslations>(
  displayLanguageSettingsTranslations
);
const languageStore = useLanguageStore();
const { displayLanguage } = storeToRefs(languageStore);
const { changeDisplayLanguage, loadLanguagePreferencesFromBackend } =
  languageStore;

const authStore = useAuthenticationStore();

const availableDisplayLanguages: ComputedRef<DisplayLanguageMetadata[]> =
  computed(() => getDisplayLanguages());

function selectDisplayLanguage(
  languageCode: SupportedDisplayLanguageCodes
): void {
  if (languageCode === displayLanguage.value) {
    return; // Already selected
  }

  try {
    changeDisplayLanguage({ newLanguage: languageCode });
  } catch (err: unknown) {
    console.error("Failed to change language:", err);
    // Type guard for error handling
    if (err instanceof Error) {
      console.error("Error message:", err.message);
    }
  }
}

// Load user's language preferences on page mount
onMounted(() => {
  // If authenticated, sync with backend in background (non-blocking)
  if (authStore.isLoggedIn) {
    void loadLanguagePreferencesFromBackend();
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

.settings-background {
  background-color: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
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

.checkmark-container {
  display: flex;
  align-items: center;
  min-width: 1.5rem;
  justify-content: center;
}
</style>
