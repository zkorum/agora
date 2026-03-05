<template>
  <OnboardingLayout :back-callback="backCallback">
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="1"
          :total-steps="2"
          :enable-next-button="(emailInputFormRef?.getIsValid() ?? true) && !isLoading"
          :show-next-button="true"
          :show-loading-button="isLoading"
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
              description=""
              icon-name="mdi-email"
            />
          </template>

          <template #body>
            <EmailInputForm ref="emailInputFormRef" @submit="submitEmail" />
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
import EmailInputForm from "src/components/verification/EmailInputForm.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useEmailSubmit } from "src/composables/verification/useEmailSubmit";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type VerifyEmailTranslations,
  verifyEmailTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<VerifyEmailTranslations>(
  verifyEmailTranslations
);

const { isLoggedIn, isAuthInitialized, credentials } = storeToRefs(
  useAuthenticationStore()
);
const { completeVerification } = useVerificationComplete();
const { showNotifyMessage } = useNotify();
const router = useRouter();

const loginIntentionStore = useLoginIntentionStore();
const { activeUserIntention } = storeToRefs(loginIntentionStore);

const { isLoading, submitEmail } = useEmailSubmit({
  onNavigateToOtp: () => router.replace({ name: "/verify/email-code/" }),
  onAlreadyHasCredential: () => {
    showNotifyMessage(t("alreadyHasEmail"));
    void completeVerification();
  },
  showNotifyMessage,
  translations: {
    throttled: t("throttled"),
    unreachable: t("unreachable"),
    disposable: t("disposable"),
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
  if (credentials.value.email !== null) {
    showNotifyMessage(t("alreadyHasEmail"));
    void completeVerification();
  }
}

const emailInputFormRef = ref<{
  submit: () => boolean;
  getIsValid: () => boolean;
} | null>(null);

function onSubmit() {
  emailInputFormRef.value?.submit();
}
</script>
