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
          t("settings.language.displayLanguage.title")
        }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="settings-section">
        <div class="settings-background">
          <SettingsMenuItem
            v-for="(language, index) in availableDisplayLanguages"
            :key="language.code"
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
            <template #left>
              <div class="language-content">
                <div class="language-name">{{ language.name }}</div>
                <div class="language-english">{{ language.englishName }}</div>
              </div>
            </template>

            <template #right>
              <div class="checkmark-container">
                <ZKIcon
                  v-if="isCurrentLanguage(language.code)"
                  color="#007AFF"
                  name="mdi-check"
                  size="1.5rem"
                />
              </div>
            </template>
          </SettingsMenuItem>
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
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useLanguageStore } from "src/stores/language";
import { useAuthenticationStore } from "src/stores/authentication";
import type {
  SupportedDisplayLanguageCodes,
  DisplayLanguageMetadata,
} from "src/shared/languages";
import { getDisplayLanguages } from "src/shared/languages";
import { computed, onMounted } from "vue";

const { t } = useI18n();
const languageStore = useLanguageStore();
const { displayLanguage } = storeToRefs(languageStore);
const { changeDisplayLanguage, loadSpokenLanguagesFromBackend } = languageStore;

const authStore = useAuthenticationStore();

const availableDisplayLanguages: ComputedRef<DisplayLanguageMetadata[]> =
  computed(() => getDisplayLanguages());

function isCurrentLanguage(
  languageCode: SupportedDisplayLanguageCodes
): boolean {
  return languageCode === displayLanguage.value;
}

function selectDisplayLanguage(
  languageCode: SupportedDisplayLanguageCodes
): void {
  if (languageCode === displayLanguage.value) {
    return; // Already selected
  }

  try {
    changeDisplayLanguage(languageCode);
  } catch (err: unknown) {
    console.error("Failed to change language:", err);
    // Type guard for error handling
    if (err instanceof Error) {
      console.error("Error message:", err.message);
    }
  }
}

// Load user's display preference on page mount
onMounted(async () => {
  // If authenticated, sync with backend in background
  if (authStore.isLoggedIn) {
    await loadSpokenLanguagesFromBackend();
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

.checkmark-container {
  display: flex;
  align-items: center;
  min-width: 1.5rem;
  justify-content: center;
}
</style>
