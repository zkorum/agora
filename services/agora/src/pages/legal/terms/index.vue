<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('termsOfService')" :center-content="true" />
    </template>

    <div>
      {{ t("referTo") }}
      <a
        href="https://zkorum.notion.site/Terms-of-Service-c37b34e934c240878b7d5af53888e72c"
        rel="noopener noreferrer"
        target="_blank"
        >{{ t("externalPageLink") }}</a
      >
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import {
  termsOfServiceTranslations,
  type TermsOfServiceTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<TermsOfServiceTranslations>(
  termsOfServiceTranslations
);
</script>

<style scoped lang="scss">
a {
  color: $primary;
  text-decoration: underline;
}
</style>
