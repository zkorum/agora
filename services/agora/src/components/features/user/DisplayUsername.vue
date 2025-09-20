<template>
  <div>
    {{ username }}
    <q-badge v-if="showIsGuest" align="middle">{{ t("guest") }}</q-badge>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  displayUsernameTranslations,
  type DisplayUsernameTranslations,
} from "./DisplayUsername.i18n";

defineProps<{
  showIsGuest: boolean;
  username: string;
}>();

const { t } = useComponentI18n<DisplayUsernameTranslations>(
  displayUsernameTranslations
);
</script>

<style lang="scss" scoped></style>
