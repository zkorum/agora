<template>
  <OnboardingLayout>
    <template #body>
      <RarimoImageExample />
    </template>

    <template #footer>
      <WidthWrapper :enable="true">
        <StepperLayout
          :submit-call-back="() => {}"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="true"
          :show-next-button="false"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              :description="t('description')"
              icon-name="mdi-wallet"
            />
          </template>

          <template #body>
            <RarimoVerificationForm />

            <div class="alternativeLogins">
              <ZKButton
                button-type="largeButton"
                :label="t('preferPhoneVerification')"
                text-color="primary"
                @click="goToPhoneVerification()"
              />

              <ZKButton
                v-if="credentialUpgradeTarget !== 'strong'"
                button-type="largeButton"
                :label="t('preferEmailLogin')"
                text-color="primary"
                @click="goToEmailLogin()"
              />
            </div>
          </template>
        </StepperLayout>
      </WidthWrapper>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import RarimoImageExample from "src/components/onboarding/backgrounds/RarimoImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import RarimoVerificationForm from "src/components/verification/RarimoVerificationForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useRouter } from "vue-router";

import {
  type PassportOnboardingTranslations,
  passportOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<PassportOnboardingTranslations>(
  passportOnboardingTranslations
);

const router = useRouter();

const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());

async function goToPhoneVerification() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
}

async function goToEmailLogin() {
  await router.replace({ name: "/onboarding/step3-email-1/" });
}
</script>

<style scoped lang="scss">
.alternativeLogins {
  display: flex;
  flex-direction: column;
}
</style>
