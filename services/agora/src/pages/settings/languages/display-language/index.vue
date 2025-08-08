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
          t("settings.language.changeDisplayLanguage")
        }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="settings-section">
        <div class="settings-background">
          <SettingsMenuItem
            v-for="(language, index) in availableLanguages"
            :key="language.code"
            :show-separator="index < availableLanguages.length - 1"
            :border-radius="
              availableLanguages.length === 1
                ? 'both'
                : index === 0
                  ? 'top'
                  : index === availableLanguages.length - 1
                    ? 'bottom'
                    : 'none'
            "
            @click="selectLanguage(language.code)"
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

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import SettingsMenuItem from "src/components/settings/SettingsMenuItem.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useI18n } from "vue-i18n";
import { useLanguagePreferences } from "src/composables/useLanguagePreferences";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { computed } from "vue";

const { t } = useI18n();
const {
  changeDisplayLanguage,
  getAvailableDisplayLanguages,
  displayLanguage,
  error,
} = useLanguagePreferences();

const availableLanguages = computed(() => getAvailableDisplayLanguages());

function isCurrentLanguage(languageCode: string): boolean {
  return languageCode === displayLanguage.value;
}

function selectLanguage(languageCode: string) {
  if (languageCode === displayLanguage.value) {
    return; // Already selected
  }

  try {
    changeDisplayLanguage(languageCode as SupportedDisplayLanguageCodes);
  } catch (err) {
    console.error("Failed to change language:", err);
  }
}
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

.error-message {
  color: #d32f2f;
  padding: 1rem;
  margin-top: 1rem;
  background-color: #ffebee;
  border-radius: 4px;
  text-align: center;
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
