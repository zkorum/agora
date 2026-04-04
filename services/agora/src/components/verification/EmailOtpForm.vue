<template>
  <div>
    <div class="instructions">
      {{ t("instructions") }}
      <span class="emailStyle">{{ verificationEmail }}</span
      >.
    </div>

    <div class="otpDiv">
      <div class="codeInput" @keydown.enter.prevent.stop="handleEnterKey">
        <ZKInputOtp
          v-model="verificationCode"
          :length="6"
          integer-only
        />
      </div>

      <div
        v-if="verificationCodeExpirySeconds > 0"
        class="weakColor codeExpiry"
      >
        {{ t("expiresIn") }} {{ verificationCodeExpirySeconds }}s
      </div>

      <div
        v-if="verificationCodeExpirySeconds <= 0"
        class="weakColor codeExpiry"
      >
        {{ t("codeExpired") }}
      </div>
    </div>

    <div class="optionButtons">
      <ZKButton
        button-type="largeButton"
        :label="t('changeEmail')"
        :disable="isInteractionLocked"
        text-color="primary"
        @click="emit('changeIdentifier')"
      />

      <ZKButton
        button-type="largeButton"
        :label="
          verificationNextCodeSeconds > 0
            ? t('resendCodeIn') +
              ' ' +
              verificationNextCodeSeconds +
              's'
            : t('resendCode')
        "
        :disable="verificationNextCodeSeconds > 0 || isInteractionLocked"
        text-color="primary"
        @click="clickedResendButton()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import {
  authenticateEmail200,
  verifyOtp200,
} from "src/shared/types/dto-auth";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { useAuthEmailApi } from "src/utils/api/auth-email";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, onUnmounted } from "vue";

import ZKButton from "../ui-library/ZKButton.vue";
import ZKInputOtp from "../ui-library/ZKInputOtp.vue";
import {
  type EmailOtpFormTranslations,
  emailOtpFormTranslations,
} from "./EmailOtpForm.i18n";

const emit = defineEmits<{
  verified: [accountMerged: boolean];
  changeIdentifier: [];
}>();

const { t } = useComponentI18n<EmailOtpFormTranslations>(
  emailOtpFormTranslations
);

const emailStore = emailVerificationStore();
const { verificationEmail, pendingOtpData } = storeToRefs(emailStore);

const {
  verificationCode,
  verificationNextCodeSeconds,
  verificationCodeExpirySeconds,
  validateAndParseOtpCode,
  codeExpired,
  resetCode,
  processRequestCodeResponse,
  setNextCodeSoonestTime,
  clearTimers,
} = useOtpTimers();

const { completeVerification } = useVerificationComplete();

const { sendEmailCode, verifyEmailOtp } = useAuthEmailApi();

const { showNotifyMessage } = useNotify();

const requestGate = createRequestGate();

onUnmounted(() => {
  requestGate.terminate();
  clearTimers();
});

const isSubmitButtonLoading = requestGate.isBusy;
const isInteractionLocked = computed(() => requestGate.isBusy.value);

onMounted(async () => {
  if (verificationEmail.value === "") {
    emit("changeIdentifier");
  } else if (pendingOtpData.value !== null) {
    processRequestCodeResponse(pendingOtpData.value);
    pendingOtpData.value = null;
  } else {
    await requestCodeClicked(false);
  }
});

async function clickedResendButton() {
  if (requestGate.isBusy.value || requestGate.isTerminated.value) {
    return;
  }
  resetCode();
  await requestCodeClicked(true);
}

function handleEnterKey() {
  if (verificationCode.value.length === 6) {
    void nextButtonClicked();
  }
}

async function nextButtonClicked() {
  const requestId = requestGate.start();
  if (requestId === null) {
    return;
  }

  const validatedCode = validateAndParseOtpCode(verificationCode.value);

  if (validatedCode === null) {
    if (requestGate.isCurrent(requestId)) {
      showNotifyMessage(t("pleaseEnterValidCode"));
    }
    requestGate.finish(requestId);
    return;
  }

  try {
    const response = await verifyEmailOtp({
      code: validatedCode,
      email: verificationEmail.value,
    });

    if (!requestGate.isCurrent(requestId)) {
      return;
    }

    if (response.status == "success") {
      const data = verifyOtp200.parse(response.data);
      if (data.success) {
        requestGate.terminate();
        if (data.accountMerged) {
          showNotifyMessage(t("accountMerged"));
        } else {
          showNotifyMessage(t("verificationSuccessful"));
        }
        emit("verified", data.accountMerged);
        await completeVerification();
      } else {
        switch (data.reason) {
          case "expired_code":
            codeExpired();
            showNotifyMessage(t("codeExpiredResend"));
            break;
          case "wrong_guess":
            showNotifyMessage(t("wrongCodeTryAgain"));
            break;
          case "too_many_wrong_guess":
            codeExpired();
            setNextCodeSoonestTime(new Date(data.nextCodeSoonestTime));
            showNotifyMessage(t("codeExpiredResend"));
            break;
          case "already_has_credential": {
            requestGate.terminate();
            showNotifyMessage(t("alreadyHasCredential"));
            emit("verified", false);
            await completeVerification();
            break;
          }
          case "associated_with_another_user": {
            showNotifyMessage(t("credentialAlreadyLinked"));
            break;
          }
          case "auth_state_changed": {
            showNotifyMessage(t("authStateChanged"));
            codeExpired();
            break;
          }
        }
      }
    } else {
      console.error("Error while verifying code", response.message);
      showNotifyMessage(t("somethingWrong"));
    }
  } finally {
    requestGate.finish(requestId);
  }
}

async function requestCodeClicked(isRequestingNewCode: boolean) {
  const requestId = requestGate.start();
  if (requestId === null) {
    return;
  }

  try {
    const response = await sendEmailCode({
      isRequestingNewCode: isRequestingNewCode,
      email: verificationEmail.value,
    });
    if (!requestGate.isCurrent(requestId)) {
      return;
    }
    if (response.status == "success") {
      const data = authenticateEmail200.parse(response.data);
      if (data.success) {
        processRequestCodeResponse(data);
      } else {
        switch (data.reason) {
          case "already_has_credential": {
            requestGate.terminate();
            showNotifyMessage(t("alreadyHasCredential"));
            emit("verified", false);
            await completeVerification();
            break;
          }
          case "associated_with_another_user":
            showNotifyMessage(t("credentialAlreadyLinked"));
            break;
          case "throttled":
            setNextCodeSoonestTime(new Date(data.nextCodeSoonestTime));
            showNotifyMessage(t("tooManyAttempts"));
            break;
          case "unreachable":
            requestGate.terminate();
            showNotifyMessage(t("unreachable"));
            emit("changeIdentifier");
            break;
          case "disposable":
            requestGate.terminate();
            showNotifyMessage(t("disposable"));
            emit("changeIdentifier");
            break;
        }
      }
    } else {
      console.error("Error while requesting a code", response.message);
      showNotifyMessage(t("somethingWrong"));
    }
  } finally {
    requestGate.finish(requestId);
  }
}

defineExpose({
  nextButtonClicked,
  isSubmitButtonLoading,
  isCodeComplete: () => verificationCode.value.length == 6,
});
</script>

<style scoped lang="scss">
.instructions {
  font-size: 1.1rem;
}

.emailStyle {
  font-weight: var(--font-weight-medium);
}

.otpDiv {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.codeInput {
  display: flex;
  justify-content: center;
}

.weakColor {
  color: $color-text-weak;
}

.codeExpiry {
  text-align: center;
}

.optionButtons {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
</style>
