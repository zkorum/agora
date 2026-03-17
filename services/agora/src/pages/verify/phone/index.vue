<template>
  <OnboardingLayout :back-callback="backCallback">
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="1"
          :total-steps="2"
          :enable-next-button="!isLoading"
          :show-next-button="true"
          :show-loading-button="isLoading"
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
              description=""
              icon-name="mdi-phone"
            />
          </template>

          <template #body>
            <PhoneInputForm ref="phoneInputFormRef" @submit="submitPhone" />
            <p v-if="!isLoggedIn"><SignupAgreement variant="verify" /></p>
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SignupAgreement from "src/components/onboarding/ui/SignupAgreement.vue";
import PhoneInputForm from "src/components/verification/PhoneInputForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { usePhoneSubmit } from "src/composables/verification/usePhoneSubmit";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type VerifyPhoneTranslations,
  verifyPhoneTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<VerifyPhoneTranslations>(
  verifyPhoneTranslations
);

const { isLoggedIn, isAuthInitialized, credentials } = storeToRefs(
  useAuthenticationStore()
);
const { completeVerification } = useVerificationComplete();
const { showNotifyMessage } = useNotify();
const router = useRouter();

const loginIntentionStore = useLoginIntentionStore();
const { activeUserIntention } = storeToRefs(loginIntentionStore);

const { isLoading, submitPhone } = usePhoneSubmit({
  onNavigateToOtp: () => router.replace({ name: "/verify/phone-code/" }),
  onAlreadyHasCredential: () => {
    showNotifyMessage(t("alreadyHasPhone"));
    void completeVerification();
  },
  showNotifyMessage,
  translations: {
    throttled: t("throttled"),
    invalidPhoneNumber: t("invalidPhoneNumber"),
    restrictedPhoneType: t("restrictedPhoneType"),
    credentialAlreadyLinked: t("credentialAlreadyLinked"),
    somethingWrong: t("somethingWrong"),
  },
});

function backCallback() {
  if (activeUserIntention.value === "settings") {
    void router.replace({ name: "/settings/" });
  } else {
    router.back();
  }
}

onMounted(() => {
  checkExistingCredential();
});
watch(isAuthInitialized, () => {
  checkExistingCredential();
});

function checkExistingCredential() {
  if (!isAuthInitialized.value) return;
  if (credentials.value.phone !== null) {
    showNotifyMessage(t("alreadyHasPhone"));
    void completeVerification();
  }
}

const phoneInputFormRef = ref<{
  submit: () => boolean;
} | null>(null);

function onSubmit() {
  phoneInputFormRef.value?.submit();
}
</script>
