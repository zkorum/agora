import { storeToRefs } from "pinia";
import { authenticateEmail200 } from "src/shared/types/dto-auth";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { useAuthEmailApi } from "src/utils/api/auth-email";
import { ref } from "vue";

interface EmailSubmitTranslations {
  alreadyHasEmail: string;
  throttled: string;
  unreachable: string;
  disposable: string;
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
  const { verificationEmail, pendingOtpData } = storeToRefs(emailStore);
  const { sendEmailCode } = useAuthEmailApi();

  const isLoading = ref(false);

  async function submitEmail() {
    const email = verificationEmail.value;
    if (email === "") return;

    isLoading.value = true;
    try {
      const response = await sendEmailCode({
        email,
        isRequestingNewCode: false,
      });
      if (response.status === "success") {
        const data = authenticateEmail200.parse(response.data);
        if (data.success) {
          pendingOtpData.value = {
            codeExpiry: new Date(data.codeExpiry),
            nextCodeSoonestTime: new Date(data.nextCodeSoonestTime),
          };
          await onNavigateToOtp();
        } else {
          switch (data.reason) {
            case "already_has_credential":
              onAlreadyHasCredential();
              break;
            case "associated_with_another_user":
              await submitEmailWithOverwrite(email);
              break;
            case "throttled":
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
      isLoading.value = false;
    }
  }

  async function submitEmailWithOverwrite(email: string) {
    const response = await sendEmailCode({
      email,
      isRequestingNewCode: false,
      keyAction: "overwrite",
    });
    if (response.status === "success") {
      const data = authenticateEmail200.parse(response.data);
      if (data.success) {
        pendingOtpData.value = {
          codeExpiry: new Date(data.codeExpiry),
          nextCodeSoonestTime: new Date(data.nextCodeSoonestTime),
        };
        await onNavigateToOtp();
      } else {
        showNotifyMessage(translations.somethingWrong);
      }
    } else {
      showNotifyMessage(translations.somethingWrong);
    }
  }

  return { isLoading, submitEmail };
}
