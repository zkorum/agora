import { storeToRefs } from "pinia";
import {
  type PhoneAuthUnavailableNoticeTranslations,
  phoneAuthUnavailableNoticeTranslations,
} from "src/components/verification/PhoneAuthUnavailableNotice.i18n";
import { phoneTurnstileTranslations } from "src/components/verification/PhoneTurnstile.i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { authenticate200 } from "src/shared/types/dto-auth";
import { useAuthenticationStore } from "src/stores/authentication";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import { getAuthenticationStartKeyAction } from "src/utils/auth/authKeyAction";
import {
  type PhoneAuthPurpose,
  type PhoneAuthUnavailableReason,
  usePhoneAuthAvailability,
} from "src/utils/auth/phoneAuthMode";
import { processEnv } from "src/utils/processEnv";
import { type MaybeRefOrGetter, onMounted, onUnmounted } from "vue";

interface PhoneSubmitTranslations {
  throttled: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
  somethingWrong: string;
}

interface UsePhoneSubmitParams {
  purpose: MaybeRefOrGetter<PhoneAuthPurpose>;
  takeTurnstileToken: () => string | undefined;
  onNavigateToOtp: () => Promise<unknown>;
  onAlreadyHasCredential: () => void;
  showNotifyMessage: (message: string) => void;
  translations: PhoneSubmitTranslations;
}

export function usePhoneSubmit({
  purpose,
  takeTurnstileToken,
  onNavigateToOtp,
  onAlreadyHasCredential,
  showNotifyMessage,
  translations,
}: UsePhoneSubmitParams) {
  const store = phoneVerificationStore();
  const { isKnown, isRegistered, isLoggedIn } = storeToRefs(
    useAuthenticationStore()
  );
  const { verificationPhoneNumber, requestCodeThrottleUntil, pendingOtpData } =
    storeToRefs(store);
  const { sendSmsCode } = useAuthPhoneApi();
  const { t: tPhoneAvailability } =
    useComponentI18n<PhoneAuthUnavailableNoticeTranslations>(
      phoneAuthUnavailableNoticeTranslations
    );
  const { t: tTurnstile } = useComponentI18n(phoneTurnstileTranslations);
  const phoneAuthAvailability = usePhoneAuthAvailability(purpose);
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

  function showPhoneAuthUnavailable(reason: PhoneAuthUnavailableReason) {
    if (reason === "technical_unavailable") {
      showNotifyMessage(tPhoneAvailability("technicalUnavailable"));
    }
  }

  async function submitPhone() {
    if (!phoneAuthAvailability.value.available) {
      showPhoneAuthUnavailable(phoneAuthAvailability.value.reason);
      return;
    }

    const phoneNumber = verificationPhoneNumber.value.internationalPhoneNumber;
    if (phoneNumber === "" || verificationNextCodeSeconds.value > 0) return;

    const requestId = requestGate.start();
    if (requestId === null) return;

    try {
      const turnstileToken = takeTurnstileToken();
      if (
        processEnv.VITE_PHONE_TURNSTILE_SITE_KEY !== undefined &&
        turnstileToken === undefined
      ) {
        showNotifyMessage(tTurnstile("retrySecurityCheck"));
        return;
      }
      const response = await sendSmsCode({
        phoneNumber,
        defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
        isRequestingNewCode: false,
        turnstileToken,
        keyAction: getAuthenticationStartKeyAction({
          isKnown: isKnown.value,
          isRegistered: isRegistered.value,
          isLoggedIn: isLoggedIn.value,
        }),
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
            case "throttled":
              requestCodeThrottleUntil.value = new Date(
                data.nextCodeSoonestTime
              );
              setNextCodeSoonestTime(requestCodeThrottleUntil.value);
              showNotifyMessage(translations.throttled);
              break;
            case "invalid_phone_number":
              showNotifyMessage(translations.invalidPhoneNumber);
              break;
            case "restricted_phone_type":
              showNotifyMessage(translations.restrictedPhoneType);
              break;
            case "phone_auth_unavailable":
              showPhoneAuthUnavailable("technical_unavailable");
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
    phoneAuthAvailability,
    nextCodeWaitSeconds: verificationNextCodeSeconds,
  };
}
