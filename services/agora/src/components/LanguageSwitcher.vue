<template>
  <q-btn-toggle
    v-model="actualLocale"
    size="sm"
    v-if="localeOptions.length > 0"
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
import { useI18n } from "vue-i18n";
import { ref, watch } from "vue";
import { onMounted } from "vue";

const { locale } = useI18n({ useScope: "global" });
let actualLocale = ref(locale.value);
onMounted(() => {
  if (actualLocale.value.includes("fr")) {
    actualLocale.value = "fr";
  } else if (locale.value.includes("en")) {
    actualLocale.value = "en-US";
  } else {
    actualLocale.value = "en-US";
  }
});
const localeOptions = [
  { value: "en-US", label: "En" },
  { value: "fr", label: "Fr" },
];
watch(actualLocale, (newValue) => {
  // Update vue-i18n locale when actualLocale changes
  locale.value = newValue;
});
</script>
