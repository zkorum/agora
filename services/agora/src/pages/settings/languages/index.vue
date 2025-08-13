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
        <template #middle>{{ t("settings.language.title") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <!-- Display language section -->
      <div class="section-header">
        <p class="section-title">Display language</p>
        <p class="section-description">
          Your preferred language for the Agora App headers, buttons and other
          text
        </p>
      </div>
      <SettingsSection :settings-item-list="displayLanguageSettings" />

      <!-- Additional languages section -->
      <div class="section-header">
        <p class="section-title">Additional languages</p>
        <p class="section-description">
          For content you would like to see on Agora
        </p>
      </div>
      <SettingsSection :settings-item-list="additionalLanguageSettings" />
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
import { getLanguageByCode } from "src/shared/languages";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { computed, onMounted } from "vue";

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthenticationStore();
const languageStore = useLanguageStore();

onMounted(() => {
  languageStore.initializeLanguage();
});

const displayLanguageSettings = computed((): SettingsInterface[] => {
  const displayLang = getLanguageByCode(languageStore.displayLanguage);
  const displayValue = displayLang ? displayLang.name : "English";

  return [
    {
      label: t("settings.language.displayLanguage.title"),
      action: () => {
        void router.push({ name: "/settings/languages/display-language/" });
      },
      style: "none",
      value: displayValue,
    },
  ];
});

const additionalLanguageSettings = computed((): SettingsInterface[] => {
  const settings: SettingsInterface[] = [];

  // Only show spoken languages option for authenticated users
  if (authStore.isLoggedIn) {
    const spokenLanguages = languageStore.spokenLanguages;
    let spokenValue = "";

    if (spokenLanguages.length === 0) {
      spokenValue = "None selected";
    } else if (spokenLanguages.length === 1) {
      const firstLang = getLanguageByCode(spokenLanguages[0]);
      spokenValue = firstLang ? firstLang.name : spokenLanguages[0];
    } else {
      const firstLang = getLanguageByCode(spokenLanguages[0]);
      const firstName = firstLang ? firstLang.name : spokenLanguages[0];
      const otherCount = spokenLanguages.length - 1;
      spokenValue = `${firstName} and ${otherCount} other${otherCount > 1 ? "s" : ""}`;
    }

    settings.push({
      label: t("settings.language.spokenLanguages.title"),
      action: () => {
        void router.push({ name: "/settings/languages/spoken-languages/" });
      },
      style: "none",
      value: spokenValue,
    });
  }

  return settings;
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
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.section-description {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}
</style>
