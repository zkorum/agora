<template>
  <OnboardingLayout>
    <template #body><ClusterImageExample /> </template>

    <template #footer>
      <StepperLayout
        :submit-call-back="goToNextRoute"
        :current-step="1"
        :total-steps="5"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            :title="t('pageTitle')"
            :description="t('description')"
            icon-name="mdi-robot"
          />
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import ClusterImageExample from "src/components/onboarding/backgrounds/ClusterImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useRouter } from "vue-router";

import {
  type SignupOnboardingTranslations,
  signupOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<SignupOnboardingTranslations>(
  signupOnboardingTranslations
);

const router = useRouter();

async function goToNextRoute() {
  await router.push({ name: "/onboarding/step2-signup/" });
}
</script>

<style scoped lang="scss"></style>
