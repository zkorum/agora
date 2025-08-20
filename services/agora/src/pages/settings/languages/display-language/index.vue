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
        <template #middle>{{ t("pageTitle") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="settings-section">
        <div class="settings-background">
          <SettingsMenuItem
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
import { getDisplayLanguages } from "src/utils/language";
import { computed, onMounted } from "vue";

const { t } = useI18n();
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
onMounted(async () => {
  // If authenticated, sync with backend in background
  if (authStore.isLoggedIn) {
    await loadLanguagePreferencesFromBackend();
  }
});
</script>

<i18n lang="yaml">
en:
  pageTitle: "Display Language"
es:
  pageTitle: "Idioma de visualización"
fr:
  pageTitle: "Langue d'affichage"
</i18n>

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
