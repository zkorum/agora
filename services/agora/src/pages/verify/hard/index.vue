<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <StepperLayout
        :submit-call-back="() => {}"
        :current-step="1"
        :total-steps="2"
        :enable-next-button="true"
        :show-next-button="false"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            :description="t('description')"
            icon-name="mdi-account-check"
          />
        </template>

        <template #body>
          <div class="buttons">
            <ZKGradientButton
              :label="t('verifyWithRarimo')"
              @click="goToPassport()"
            />

            <ZKGradientButton
              :label="t('verifyWithPhone')"
              gradient-background="#E7E7FF"
              label-color="#6b4eff"
              @click="goToPhone()"
            />

            <ZKGradientButton
              :label="t('verifyWithEmail')"
              gradient-background="#E7E7FF"
              label-color="#6b4eff"
              @click="goToEmail()"
            />
          </div>

          <p v-if="!isLoggedIn"><SignupAgreement variant="login" /></p>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SignupAgreement from "src/components/onboarding/ui/SignupAgreement.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useRouter } from "vue-router";

import {
  type VerifyHardTranslations,
  verifyHardTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<VerifyHardTranslations>(
  verifyHardTranslations
);

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const router = useRouter();

async function goToPassport() {
  await router.replace({ name: "/verify/passport/" });
}

async function goToPhone() {
  await router.replace({ name: "/verify/phone/" });
}

async function goToEmail() {
  await router.replace({ name: "/verify/email/" });
}
</script>

<style scoped lang="scss">
.buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
