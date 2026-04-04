import { storeToRefs } from "pinia";
import { createRequestGate } from "src/composables/verification/createRequestGate";
import { useOtpTimers } from "src/composables/verification/useOtpTimers";
import { authenticateEmail200 } from "src/shared/types/dto-auth";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { useAuthEmailApi } from "src/utils/api/auth-email";
import { onMounted, onUnmounted } from "vue";

interface EmailSubmitTranslations {
  throttled: string;
  unreachable: string;
  disposable: string;
  credentialAlreadyLinked: string;
  somethingWrong: string;
}

interface UseEmailSubmitParams {
  onNavigateToOtp: () => Promise<unknown>;
  onAlreadyHasCredential: () => void;
  showNotifyMessage: (message: string) => void;
  translations: EmailSubmitTranslations;
}

export function useEmailSubmit({
  onNavigateToOtp,
  onAlreadyHasCredential,
  showNotifyMessage,
  translations,
}: UseEmailSubmitParams) {
  const emailStore = emailVerificationStore();
  const { verificationEmail, requestCodeThrottleUntil, pendingOtpData } =
    storeToRefs(emailStore);
  const { sendEmailCode } = useAuthEmailApi();
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

  async function submitEmail() {
    const email = verificationEmail.value;
    if (email === "" || verificationNextCodeSeconds.value > 0) return;

    const requestId = requestGate.start();
    if (requestId === null) return;

    try {
      const response = await sendEmailCode({
        email,
        isRequestingNewCode: false,
      });
      if (!requestGate.isCurrent(requestId)) {
        return;
      }
      if (response.status === "success") {
        const data = authenticateEmail200.parse(response.data);
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
            case "unreachable":
              showNotifyMessage(translations.unreachable);
              break;
            case "disposable":
              showNotifyMessage(translations.disposable);
              break;
          }
        }
      } else {
        console.error("Error while sending email code", response.message);
        showNotifyMessage(translations.somethingWrong);
      }
    } finally {
      requestGate.finish(requestId);
    }
  }

  return {
    isLoading,
    submitEmail,
    nextCodeWaitSeconds: verificationNextCodeSeconds,
  };
}
