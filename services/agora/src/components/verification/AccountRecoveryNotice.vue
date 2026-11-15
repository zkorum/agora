<template>
  <div role="status" class="q-my-md">
    <p>{{ unavailable ? t("unavailable") : t("required") }}</p>
    <SpaLink v-if="!unavailable" to="/recover/">{{ t("title") }}</SpaLink>
  </div>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import { accountRecoveryTranslations } from "./AccountRecovery.i18n";
defineProps<{ unavailable: boolean }>();
const { t } = useComponentI18n(accountRecoveryTranslations);
</script>
