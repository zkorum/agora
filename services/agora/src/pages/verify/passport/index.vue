<template>
  <OnboardingLayout>
    <template #body>
      <RarimoImageExample />
    </template>

    <template #footer>
      <WidthWrapper :enable="true">
        <StepperLayout
          :submit-call-back="() => {}"
          :current-step="1"
          :total-steps="1"
          :enable-next-button="true"
          :show-next-button="false"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
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
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type VerifyPassportTranslations,
  verifyPassportTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<VerifyPassportTranslations>(
  verifyPassportTranslations
);

const { isAuthInitialized, credentials } = storeToRefs(
  useAuthenticationStore()
);
const { completeVerification } = useVerificationComplete();
const { showNotifyMessage } = useNotify();
const router = useRouter();

onMounted(() => {
  checkExistingCredential();
});
watch(isAuthInitialized, () => {
  checkExistingCredential();
});

function checkExistingCredential() {
  if (!isAuthInitialized.value) return;
  if (credentials.value.rarimo !== null) {
    showNotifyMessage(t("alreadyHasPassport"));
    void completeVerification();
  }
}

async function goToPhoneVerification() {
  await router.replace({ name: "/verify/phone/" });
}
</script>

<style scoped lang="scss">
.alternativeLogins {
  display: flex;
  flex-direction: column;
}
</style>
