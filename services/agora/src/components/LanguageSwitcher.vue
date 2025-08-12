<template>
  <q-btn-toggle
    v-model="actualLocale"
    size="sm"
    no-caps
    rounded
    unelevated
    toggle-color="brand-teal"
    toggle-text-color="brand-dark"
    color="white"
    text-color="brand-dark"
    :options="localeOptions"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLanguageStore } from "src/stores/language";

const languageStore = useLanguageStore();

const actualLocale = computed({
  get: () => languageStore.displayLanguage,
  set: (value) => {
    void languageStore.changeDisplayLanguage(value);
  },
});

const localeOptions = computed(() =>
  languageStore.availableLocales.map((lang: string) => ({
    value: lang,
    label: lang.split("-")[0].toUpperCase(),
  }))
);
</script>
