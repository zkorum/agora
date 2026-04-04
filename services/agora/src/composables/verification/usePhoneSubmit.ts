import { storeToRefs } from "pinia";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { authenticate200 } from "src/shared/types/dto-auth";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import { onMounted, onUnmounted } from "vue";

interface PhoneSubmitTranslations {
  throttled: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
  credentialAlreadyLinked: string;
  somethingWrong: string;
}

interface UsePhoneSubmitParams {
  onNavigateToOtp: () => Promise<unknown>;
  onAlreadyHasCredential: () => void;
  showNotifyMessage: (message: string) => void;
  translations: PhoneSubmitTranslations;
}

export function usePhoneSubmit({
  onNavigateToOtp,
  onAlreadyHasCredential,
  showNotifyMessage,
  translations,
}: UsePhoneSubmitParams) {
  const store = phoneVerificationStore();
  const { verificationPhoneNumber, requestCodeThrottleUntil, pendingOtpData } =
    storeToRefs(store);
  const { sendSmsCode } = useAuthPhoneApi();
  const requestGate = createRequestGate();
  const { verificationNextCodeSeconds, setNextCodeSoonestTime, clearTimers } =
    useOtpTimers();

  onMounted(() => {
    if (requestCodeThrottleUntil.value === null) {
      return;
    }

    if (requestCodeThrottleUntil.value.getTime() <= Date.now()) {
      requestCodeThrottleUntil.value = null;
      return;
    }

    setNextCodeSoonestTime(requestCodeThrottleUntil.value);
  });

  onUnmounted(() => {
    requestGate.terminate();
    clearTimers();
  });

  const { isBusy: isLoading } = requestGate;

  async function submitPhone() {
    const phoneNumber = verificationPhoneNumber.value.internationalPhoneNumber;
    if (phoneNumber === "" || verificationNextCodeSeconds.value > 0) return;

    const requestId = requestGate.start();
    if (requestId === null) return;

    try {
      const response = await sendSmsCode({
        phoneNumber,
        defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
        isRequestingNewCode: false,
      });
      if (!requestGate.isCurrent(requestId)) {
        return;
      }
      if (response.status === "success") {
        const data = authenticate200.parse(response.data);
        if (data.success) {
          requestCodeThrottleUntil.value = null;
          pendingOtpData.value = {
            codeExpiry: new Date(data.codeExpiry),
            nextCodeSoonestTime: new Date(data.nextCodeSoonestTime),
          };
          requestGate.terminate();
          await onNavigateToOtp();
        } else {
          switch (data.reason) {
            case "already_has_credential":
              requestCodeThrottleUntil.value = null;
              requestGate.terminate();
              onAlreadyHasCredential();
              break;
            case "associated_with_another_user":
              showNotifyMessage(translations.credentialAlreadyLinked);
              break;
            case "throttled":
              requestCodeThrottleUntil.value = new Date(data.nextCodeSoonestTime);
              setNextCodeSoonestTime(requestCodeThrottleUntil.value);
              showNotifyMessage(translations.throttled);
              break;
            case "invalid_phone_number":
              showNotifyMessage(translations.invalidPhoneNumber);
              break;
            case "restricted_phone_type":
              showNotifyMessage(translations.restrictedPhoneType);
              break;
          }
        }
      } else {
        console.error("Error while sending SMS code", response.message);
        showNotifyMessage(translations.somethingWrong);
      }
    } finally {
      requestGate.finish(requestId);
    }
  }

  return {
    isLoading,
    submitPhone,
    nextCodeWaitSeconds: verificationNextCodeSeconds,
  };
}
