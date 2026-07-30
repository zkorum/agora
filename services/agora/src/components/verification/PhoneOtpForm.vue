<template>
  <div>
    <PhoneAuthUnavailableNotice
      v-if="!phoneAuthAvailability.available"
      :reason="phoneAuthAvailability.reason"
    />

    <template v-else>
      <div class="instructions">
        {{ t("instructions") }}
        <span class="phoneNumberStyle">{{ formattedPhoneNumber }}</span
        >.
      </div>

      <div class="otpDiv">
        <div class="codeInput" @keydown.enter.prevent.stop="handleEnterKey">
          <ZKInputOtp v-model="verificationCode" :length="6" integer-only />
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

    </template>

    <div class="optionButtons">
      <ZKButton
        button-type="largeButton"
        :label="t('changeNumber')"
        :disable="isInteractionLocked"
        text-color="primary"
        @click="emit('changeIdentifier')"
      />

      <template v-if="phoneAuthAvailability.available">
        <ZKButton
          button-type="largeButton"
          :label="
            verificationNextCodeSeconds > 0
              ? t('resendCodeIn') + ' ' + verificationNextCodeSeconds + 's'
              : t('resendCode')
          "
          :disable="verificationNextCodeSeconds > 0 || isInteractionLocked"
          text-color="primary"
          @click="clickedResendButton()"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  type PhoneAuthUnavailableNoticeTranslations,
  phoneAuthUnavailableNoticeTranslations,
} from "src/components/verification/PhoneAuthUnavailableNotice.i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import { authenticate200, verifyPhoneOtp200 } from "src/shared/types/dto-auth";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import {
  type PhoneAuthAvailability,
  type PhoneAuthPurpose,
  type PhoneAuthUnavailableReason,
  restrictPhoneAuthMode,
  usePhoneAuthAvailability,
} from "src/utils/auth/phoneAuthMode";
import { useNotify } from "src/utils/ui/notify";
import { computed, onUnmounted, ref, watch, watchEffect } from "vue";

import ZKButton from "../ui-library/ZKButton.vue";
import ZKInputOtp from "../ui-library/ZKInputOtp.vue";
import PhoneAuthUnavailableNotice from "./PhoneAuthUnavailableNotice.vue";
import {
  type PhoneOtpFormTranslations,
  phoneOtpFormTranslations,
} from "./PhoneOtpForm.i18n";

const props = defineProps<{
  purpose: PhoneAuthPurpose;
}>();
const emit = defineEmits<{
  verified: [accountMerged: boolean];
  changeIdentifier: [];
}>();

const { t } = useComponentI18n<PhoneOtpFormTranslations>(
  phoneOtpFormTranslations
);
const { t: tPhoneAvailability } =
  useComponentI18n<PhoneAuthUnavailableNoticeTranslations>(
    phoneAuthUnavailableNoticeTranslations
  );

const phoneStore = phoneVerificationStore();
const { verificationPhoneNumber, pendingOtpData } = storeToRefs(phoneStore);
const modeAvailability = usePhoneAuthAvailability(() => props.purpose);
const responseUnavailableReason = ref<PhoneAuthUnavailableReason>();
const phoneAuthAvailability = computed<PhoneAuthAvailability>(() => {
  if (responseUnavailableReason.value !== undefined) {
    return {
      available: false,
      reason: responseUnavailableReason.value,
    };
  }
  return modeAvailability.value;
});

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

const { sendSmsCode, verifyPhoneOtp } = useAuthPhoneApi();

const { showNotifyMessage } = useNotify();

const requestGate = createRequestGate();

onUnmounted(() => {
  requestGate.terminate();
  clearTimers();
});

const isSubmitButtonLoading = requestGate.isBusy;
const isInteractionLocked = computed(() => requestGate.isBusy.value);

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

let isInitialized = false;
watch(
  phoneAuthAvailability,
  async (availability) => {
    if (!availability.available || isInitialized) {
      return;
    }
    isInitialized = true;

    if (verificationPhoneNumber.value.internationalPhoneNumber === "") {
      emit("changeIdentifier");
    } else if (pendingOtpData.value !== null) {
      processRequestCodeResponse(pendingOtpData.value);
      pendingOtpData.value = null;
    } else {
      await requestCodeClicked(false);
    }
  },
  { immediate: true }
);

async function clickedResendButton() {
  if (!ensurePhoneAuthAvailable()) {
    return;
  }

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
  if (!ensurePhoneAuthAvailable()) {
    return;
  }

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
    const response = await verifyPhoneOtp({
      code: validatedCode,
      phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
      defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
    });

    if (!requestGate.isCurrent(requestId)) {
      return;
    }

    if (response.status == "success") {
      const data = verifyPhoneOtp200.parse(response.data);
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
          case "verification_failed": {
            showNotifyMessage(t("somethingWrong"));
            codeExpired();
            break;
          }
          case "phone_auth_unavailable":
            handlePhoneAuthUnavailable("technical_unavailable");
            break;
          case "phone_registration_unavailable":
            handlePhoneAuthUnavailable("registration_unavailable");
            break;
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
  if (!ensurePhoneAuthAvailable()) {
    return;
  }

  const requestId = requestGate.start();
  if (requestId === null) {
    return;
  }

  try {
    const response = await sendSmsCode({
      isRequestingNewCode: isRequestingNewCode,
      phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
      defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
    });
    if (!requestGate.isCurrent(requestId)) {
      return;
    }
    if (response.status == "success") {
      const data = authenticate200.parse(response.data);
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
          case "throttled":
            setNextCodeSoonestTime(new Date(data.nextCodeSoonestTime));
            showNotifyMessage(t("tooManyAttempts"));
            break;
          case "invalid_phone_number":
            showNotifyMessage(t("invalidPhoneNumber"));
            break;
          case "restricted_phone_type":
            showNotifyMessage(t("restrictedPhoneType"));
            break;
          case "phone_auth_unavailable":
            handlePhoneAuthUnavailable("technical_unavailable");
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

function showPhoneAuthUnavailable(reason: PhoneAuthUnavailableReason) {
  showNotifyMessage(
    reason === "technical_unavailable"
      ? tPhoneAvailability("technicalUnavailable")
      : tPhoneAvailability("registrationUnavailable")
  );
}

function handlePhoneAuthUnavailable(reason: PhoneAuthUnavailableReason): void {
  restrictPhoneAuthMode(
    reason === "technical_unavailable" ? "disabled" : "login_only"
  );
  responseUnavailableReason.value = reason;
  showPhoneAuthUnavailable(reason);
  requestGate.terminate();
}

function ensurePhoneAuthAvailable(): boolean {
  if (phoneAuthAvailability.value.available) {
    return true;
  }

  showPhoneAuthUnavailable(phoneAuthAvailability.value.reason);
  return false;
}

defineExpose({
  nextButtonClicked,
  isSubmitButtonLoading,
  isAvailable: computed(() => phoneAuthAvailability.value.available),
  isCodeComplete: () =>
    phoneAuthAvailability.value.available && verificationCode.value.length == 6,
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
