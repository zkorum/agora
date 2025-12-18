<template>
  <span>
    {{ t("agreementText") }}
    <span class="hrefLink">
      <RouterLink :to="{ name: '/legal/terms/' }">
        {{ t("termsOfService") }}</RouterLink
      >
    </span>
    {{ t("and") }}
    <span class="hrefLink">
      <RouterLink :to="{ name: '/legal/privacy/' }">
        {{ t("privacyPolicy") }}</RouterLink
      > </span
    >.
  </span>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type SignupAgreementTranslations,
  signupAgreementTranslations,
} from "./SignupAgreement.i18n";

const { t } = useComponentI18n<SignupAgreementTranslations>(
  signupAgreementTranslations
);
</script>

<style lang="scss" scoped>
.hrefLink > a {
  color: $primary;
  text-decoration: underline;
  font-weight: var(--font-weight-medium);
}
</style>
