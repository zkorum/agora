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
      <SettingsContainer>
        <div
          v-for="(language, index) in availableLanguages"
          :key="language.code"
        >
          <div class="language-item" @click="selectLanguage(language.code)">
            <div class="language-content">
              <div class="language-name">{{ language.name }}</div>
              <div class="language-english">{{ language.englishName }}</div>
            </div>

            <div class="checkmark-container">
              <ZKIcon
                v-if="isCurrentLanguage(language.code)"
                color="#007AFF"
                name="mdi-check"
                size="1.5rem"
              />
            </div>
          </div>

          <q-separator v-if="index != availableLanguages.length - 1" />
        </div>
      </SettingsContainer>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import SettingsContainer from "src/components/settings/SettingsContainer.vue";
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

.error-message {
  color: #d32f2f;
  padding: 1rem;
  margin-top: 1rem;
  background-color: #ffebee;
  border-radius: 4px;
  text-align: center;
}

.language-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 1rem;
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
