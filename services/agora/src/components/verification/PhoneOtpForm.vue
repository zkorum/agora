<template>
  <div>
    <AccountRecoveryNotice
      v-if="recoveryReason !== undefined"
      :unavailable="recoveryReason === 'recovery_unavailable'"
    />
    <div
      v-if="countryPolicy.isPending.value"
      class="row justify-center q-pa-md"
    >
      <q-spinner />
    </div>
    <PhoneAuthUnavailableNotice
      v-else-if="!phoneAuthAvailability.available"
      :reason="phoneAuthAvailability.reason"
    />

    <template v-else>
      <div>
        {{ t("instructions") }}
        <span class="phoneNumberStyle">{{ formattedPhoneNumber }}</span
        >.
      </div>
      <PhoneTurnstile
        ref="turnstileWidget"
        @token-ready="sendInitialCodeWhenReady"
      />

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
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { storeToRefs } from "pinia";
import {
  type PhoneAuthUnavailableNoticeTranslations,
  phoneAuthUnavailableNoticeTranslations,
} from "src/components/verification/PhoneAuthUnavailableNotice.i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { usePhoneCountryPolicy } from "src/composables/verification/usePhoneCountryPolicy";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import { authenticate200, verifyPhoneOtp200 } from "src/shared/types/dto-auth";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import {
  type PhoneAuthAvailability,
  type PhoneAuthPurpose,
  type PhoneAuthUnavailableReason,
} from "src/utils/auth/phoneAuthMode";
import { processEnv } from "src/utils/processEnv";
import { useNotify } from "src/utils/ui/notify";
import { computed, onUnmounted, ref, watch } from "vue";

import ZKButton from "../ui-library/ZKButton.vue";
import ZKInputOtp from "../ui-library/ZKInputOtp.vue";
import AccountRecoveryNotice from "./AccountRecoveryNotice.vue";
import PhoneAuthUnavailableNotice from "./PhoneAuthUnavailableNotice.vue";
import {
  type PhoneOtpFormTranslations,
  phoneOtpFormTranslations,
} from "./PhoneOtpForm.i18n";
import { phoneTurnstileTranslations } from "./PhoneTurnstile.i18n";
import PhoneTurnstile from "./PhoneTurnstile.vue";

const props = defineProps<{
  recoverAccount: boolean;
  purpose: PhoneAuthPurpose;
}>();
const emit = defineEmits<{
  verified: [accountMerged: boolean];
  changeIdentifier: [];
}>();
const recoveryReason = ref<"recovery_required" | "recovery_unavailable">();
const { t } = useComponentI18n<PhoneOtpFormTranslations>(
  phoneOtpFormTranslations
);
const { t: tTurnstile } = useComponentI18n(phoneTurnstileTranslations);
const { t: tPhoneAvailability } =
  useComponentI18n<PhoneAuthUnavailableNoticeTranslations>(
    phoneAuthUnavailableNoticeTranslations
  );

const phoneStore = phoneVerificationStore();
const { verificationPhoneNumber, pendingOtpData } = storeToRefs(phoneStore);
const countryPolicy = usePhoneCountryPolicy();
const parsedPhoneNumber = computed(() =>
  parsePhoneNumberFromString(
    verificationPhoneNumber.value.internationalPhoneNumber
  )
);
const policyAvailability = computed(() =>
  verificationPhoneNumber.value.internationalPhoneNumber === ""
    ? countryPolicy.availabilityForPurpose(props.purpose)
    : countryPolicy.availabilityFor({
        purpose: props.purpose,
        country: parsedPhoneNumber.value?.country,
      })
);
const responseUnavailableReason = ref<"registration_unavailable">();
const phoneAuthAvailability = computed<PhoneAuthAvailability>(() => {
  if (!countryPolicy.isReady.value)
    return { available: false, reason: "technical_unavailable" };
  if (responseUnavailableReason.value !== undefined) {
    return {
      available: false,
      reason: responseUnavailableReason.value,
    };
  }
  return policyAvailability.value;
});
watch(
  () => policyAvailability.value.available,
  (available) => {
    if (available) responseUnavailableReason.value = undefined;
  }
);

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

const { completeVerification, isCompletingVerification, hasCompletionFailed } =
  useVerificationComplete();

const { sendSmsCode, verifyPhoneOtp } = useAuthPhoneApi();
const turnstileWidget = ref<InstanceType<typeof PhoneTurnstile>>();
const initialCodeAwaitingChallenge = ref(false);

const { showNotifyMessage } = useNotify();

const requestGate = createRequestGate();

onUnmounted(() => {
  requestGate.terminate();
  clearTimers();
});

const isSubmitButtonLoading = computed(
  () => requestGate.isBusy.value || isCompletingVerification.value
);
const isInteractionLocked = computed(
  () => isSubmitButtonLoading.value || requestGate.isTerminated.value
);

const formattedPhoneNumber = computed(
  () =>
    parsedPhoneNumber.value?.formatInternational() ??
    verificationPhoneNumber.value.internationalPhoneNumber
);

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
      if (processEnv.VITE_TURNSTILE_SITE_KEY !== undefined) {
        initialCodeAwaitingChallenge.value = true;
      } else {
        await requestCodeClicked(false);
      }
    }
  },
  { immediate: true }
);

function sendInitialCodeWhenReady(): void {
  if (!initialCodeAwaitingChallenge.value) return;
  initialCodeAwaitingChallenge.value = false;
  void requestCodeClicked(false);
}

async function clickedResendButton() {
  if (!ensurePhoneAuthAvailable()) {
    return;
  }

  if (requestGate.isBusy.value || requestGate.isTerminated.value) {
    return;
  }
  await requestCodeClicked(true);
}

function handleEnterKey() {
  if (verificationCode.value.length === 6) {
    void nextButtonClicked();
  }
}

async function nextButtonClicked() {
  if (hasCompletionFailed.value) {
    await finishVerification();
    return;
  }
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
      recoverAccount: props.recoverAccount,
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
        await finishVerification();
      } else {
        switch (data.reason) {
          case "recovery_required":
          case "recovery_unavailable":
            recoveryReason.value = data.reason;
            codeExpired();
            break;
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
            await finishVerification();
            break;
          }
          case "verification_failed": {
            showNotifyMessage(t("somethingWrong"));
            codeExpired();
            break;
          }
          case "phone_auth_unavailable":
            showPhoneAuthUnavailable("technical_unavailable");
            break;
          case "phone_registration_unavailable":
            await handlePhoneRegistrationUnavailable();
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
    const turnstileToken = turnstileWidget.value?.takeToken();
    if (
      processEnv.VITE_TURNSTILE_SITE_KEY !== undefined &&
      turnstileToken === undefined
    ) {
      showNotifyMessage(tTurnstile("retrySecurityCheck"));
      return;
    }
    const response = await sendSmsCode({
      isRequestingNewCode: isRequestingNewCode,
      phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
      defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
      turnstileToken,
    });
    if (!requestGate.isCurrent(requestId)) {
      return;
    }
    if (response.status == "success") {
      const data = authenticate200.parse(response.data);
      if (data.success) {
        if (isRequestingNewCode) resetCode();
        processRequestCodeResponse(data);
      } else {
        switch (data.reason) {
          case "already_has_credential": {
            requestGate.terminate();
            showNotifyMessage(t("alreadyHasCredential"));
            emit("verified", false);
            await finishVerification();
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
            showPhoneAuthUnavailable("technical_unavailable");
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
  if (reason === "technical_unavailable") {
    showNotifyMessage(tPhoneAvailability("technicalUnavailable"));
  }
}

async function handlePhoneRegistrationUnavailable(): Promise<void> {
  responseUnavailableReason.value = "registration_unavailable";
  const result = await countryPolicy.refresh();
  if (result.isSuccess && policyAvailability.value.available) {
    responseUnavailableReason.value = undefined;
  }
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
    phoneAuthAvailability.value.available &&
    (verificationCode.value.length === 6 || hasCompletionFailed.value),
});

async function finishVerification(): Promise<void> {
  try {
    await completeVerification();
  } catch {
    showNotifyMessage(t("somethingWrong"));
  }
}
</script>

<style scoped lang="scss">
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
