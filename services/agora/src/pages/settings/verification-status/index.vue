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
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <div class="container">
      <ListSection :settings-item-list="verificationDetails" />
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ListSection from "src/components/ui-library/ListSection.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { computed } from "vue";

import {
  type VerificationStatusTranslations,
  verificationStatusTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<VerificationStatusTranslations>(
  verificationStatusTranslations
);

const { credentials } = storeToRefs(useAuthenticationStore());

const verificationDetails = computed<SettingsInterface[]>(() => {
  const rarimo = credentials.value.rarimo;
  if (rarimo === null) return [];
  return [
    {
      type: "action",
      label: t("detectedSex"),
      value: rarimo.sex,
      action: () => {},
    },
    {
      type: "action",
      label: t("citizenship"),
      value: rarimo.citizenship,
      action: () => {},
    },
  ];
});
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
