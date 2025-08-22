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
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  signupAgreementTranslations,
  type SignupAgreementTranslations,
} from "./SignupAgreement.i18n";

const { t } = useComponentI18n<SignupAgreementTranslations>(
  signupAgreementTranslations
);
</script>

<style lang="scss" scoped>
.hrefLink > a {
  color: $primary;
  text-decoration: underline;
  font-weight: 500;
}
</style>
