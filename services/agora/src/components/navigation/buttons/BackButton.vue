<template>
  <NavigationButton
    icon="ci:chevron-left"
    :aria-label="t('goBack')"
    :fallback-route="fallbackRoute"
  />
</template>

<script setup lang="ts">
import NavigationButton from "src/components/navigation/NavigationButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { RouteLocationRaw } from "vue-router";

import {
  type BackButtonTranslations,
  backButtonTranslations,
} from "./BackButton.i18n";

interface Props {
  fallbackRoute?: RouteLocationRaw;
}

withDefaults(defineProps<Props>(), {
  fallbackRoute: () => ({ name: "/" }),
});

const { t } = useComponentI18n<BackButtonTranslations>(backButtonTranslations);
</script>
