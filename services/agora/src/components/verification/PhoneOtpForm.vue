<template>
  <div>
    <div class="instructions">
      {{ t("instructions") }}
      <span class="phoneNumberStyle">{{ formattedPhoneNumber }}</span
      >.
    </div>

    <div class="otpDiv">
      <div class="codeInput">
        <PrimeInputOtp
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
        :label="t('changeNumber')"
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
        :disable="verificationNextCodeSeconds > 0"
        text-color="primary"
        @click="clickedResendButton()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import InputOtp from "primevue/inputotp";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import {
  authenticate200,
  verifyOtp200,
} from "src/shared/types/dto-auth";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import type { KeyAction } from "src/utils/api/common";
import { createDidOverwriteIfAlreadyExists } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref, watchEffect } from "vue";

import ZKButton from "../ui-library/ZKButton.vue";
import {
  type PhoneOtpFormTranslations,
  phoneOtpFormTranslations,
} from "./PhoneOtpForm.i18n";

defineOptions({
  components: {
    PrimeInputOtp: InputOtp,
  },
});

const emit = defineEmits<{
  verified: [accountMerged: boolean];
  changeIdentifier: [];
}>();

const { t } = useComponentI18n<PhoneOtpFormTranslations>(
  phoneOtpFormTranslations
);

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const {
  verificationCode,
  verificationNextCodeSeconds,
  verificationCodeExpirySeconds,
  validateAndParseOtpCode,
  codeExpired,
  resetCode,
  processRequestCodeResponse,
} = useOtpTimers();

const { completeVerification } = useVerificationComplete();

const { sendSmsCode, verifyPhoneOtp } = useAuthPhoneApi();

const { showNotifyMessage } = useNotify();

const isSubmitButtonLoading = ref(false);

const formattedPhoneNumber = ref("");

watchEffect(() => {
  const phoneNumber = verificationPhoneNumber.value.internationalPhoneNumber;
  if (!phoneNumber) {
    formattedPhoneNumber.value = "";
    return;
  }

  formattedPhoneNumber.value = phoneNumber;

  void (async () => {
    try {
      const { parsePhoneNumberFromString } =
        await import("libphonenumber-js/max");
      const parsed = parsePhoneNumberFromString(phoneNumber);
      formattedPhoneNumber.value = parsed?.formatInternational() || phoneNumber;
    } catch (e) {
      console.warn("Failed to load phone formatter", e);
    }
  })();
});

onMounted(async () => {
  if (verificationPhoneNumber.value.internationalPhoneNumber == "") {
    emit("changeIdentifier");
  } else {
    await requestCodeClicked(false);
  }
});

async function clickedResendButton() {
  resetCode();
  await requestCodeClicked(true);
}

async function nextButtonClicked() {
  isSubmitButtonLoading.value = true;

  const validatedCode = validateAndParseOtpCode(verificationCode.value);

  if (validatedCode === null) {
    isSubmitButtonLoading.value = false;
    showNotifyMessage(t("pleaseEnterValidCode"));
    return;
  }

  const response = await verifyPhoneOtp({
    code: validatedCode,
    phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
    defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
  });

  isSubmitButtonLoading.value = false;

  if (response.status == "success") {
    const data = verifyOtp200.parse(response.data);
    if (data.success) {
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
          showNotifyMessage(t("codeExpiredResend"));
          break;
        case "already_has_credential": {
          showNotifyMessage(t("alreadyHasCredential"));
          emit("verified", false);
          await completeVerification();
          break;
        }
        case "associated_with_another_user": {
          showNotifyMessage(t("syncHiccupDetected"));
          await createDidOverwriteIfAlreadyExists();
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
}

async function requestCodeClicked(
  isRequestingNewCode: boolean,
  keyAction?: KeyAction
) {
  const response = await sendSmsCode({
    isRequestingNewCode: isRequestingNewCode,
    phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
    defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
    keyAction: keyAction,
  });
  if (response.status == "success") {
    const data = authenticate200.parse(response.data);
    if (data.success) {
      processRequestCodeResponse(data);
    } else {
      switch (data.reason) {
        case "already_has_credential": {
          showNotifyMessage(t("alreadyHasCredential"));
          emit("verified", false);
          await completeVerification();
          break;
        }
        case "associated_with_another_user":
          await requestCodeClicked(isRequestingNewCode, "overwrite");
          break;
        case "throttled":
          showNotifyMessage(t("tooManyAttempts"));
          break;
        case "invalid_phone_number":
          showNotifyMessage(t("invalidPhoneNumber"));
          break;
        case "restricted_phone_type":
          showNotifyMessage(t("restrictedPhoneType"));
          break;
      }
    }
  } else {
    console.error("Error while requesting a code", response.message);
    showNotifyMessage(t("somethingWrong"));
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

.phoneNumberStyle {
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
