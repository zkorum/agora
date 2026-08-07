<template>
  <NavigationButton icon="pi pi-times" :aria-label="t('close')" />
</template>

<script setup lang="ts">
import NavigationButton from "src/components/navigation/NavigationButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type CloseButtonTranslations,
  closeButtonTranslations,
} from "./CloseButton.i18n";

const { t } = useComponentI18n<CloseButtonTranslations>(
  closeButtonTranslations
);
</script>

<style scoped></style>
