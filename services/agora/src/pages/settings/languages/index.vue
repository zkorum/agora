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
      <!-- Display language section -->
      <div class="section-header">
        <p class="section-title">{{ t("displayLanguageTitle") }}</p>
        <p class="section-description">
          {{ t("displayLanguageDescription") }}
        </p>
      </div>
      <SettingsSection :settings-item-list="displayLanguageSettings" />

      <!-- Additional languages section -->
      <div v-if="authStore.isLoggedIn" class="section-header">
        <p class="section-title">{{ t("additionalLanguagesTitle") }}</p>
        <p class="section-description">
          {{ t("additionalLanguagesDescription") }}
        </p>
      </div>
      <SettingsSection
        v-if="authStore.isLoggedIn"
        :settings-item-list="additionalLanguageSettings"
      />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { getLanguageByCode } from "src/utils/language";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  languagesSettingsTranslations,
  type LanguagesSettingsTranslations,
} from "./index.i18n";
import { computed } from "vue";

const { t } = useComponentI18n<LanguagesSettingsTranslations>(
  languagesSettingsTranslations
);
const authStore = useAuthenticationStore();
const languageStore = useLanguageStore();

const displayLanguageSettings = computed((): SettingsInterface[] => {
  const displayLang = getLanguageByCode(languageStore.displayLanguage);
  const displayValue = displayLang ? displayLang.name : t("englishFallback");

  return [
    {
      type: "navigation",
      label: t("displayLanguageLabel"),
      to: "/settings/languages/display-language/",
      style: "none",
      value: displayValue,
    },
  ];
});

const additionalLanguageSettings = computed((): SettingsInterface[] => {
  const spokenLanguages = languageStore.spokenLanguages;
  let spokenValue = "";

  if (spokenLanguages.length === 0) {
    spokenValue = t("noneSelected");
  } else if (spokenLanguages.length === 1) {
    const firstLang = getLanguageByCode(spokenLanguages[0]);
    spokenValue = firstLang ? firstLang.name : spokenLanguages[0];
  } else {
    const firstLang = getLanguageByCode(spokenLanguages[0]);
    const firstName = firstLang ? firstLang.name : spokenLanguages[0];
    const otherCount = spokenLanguages.length - 1;
    const otherText = otherCount > 1 ? t("others") : t("other");
    spokenValue = `${firstName} ${t("and")} ${otherCount} ${otherText}`;
  }

  return [
    {
      type: "navigation",
      label: t("spokenLanguagesLabel"),
      to: "/settings/languages/spoken-languages/",
      style: "none",
      value: spokenValue,
    },
  ];
});
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.section-header {
  margin-bottom: 1rem;
  margin-top: 1.5rem;

  &:first-child {
    margin-top: 0;
  }
}

.section-title {
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  color: #1f2937;
}

.section-description {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}
</style>
