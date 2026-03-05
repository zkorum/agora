import { storeToRefs } from "pinia";
import { authenticate200 } from "src/shared/types/dto-auth";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useAuthPhoneApi } from "src/utils/api/auth-phone";
import { ref } from "vue";

interface PhoneSubmitTranslations {
  throttled: string;
  invalidPhoneNumber: string;
  restrictedPhoneType: string;
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
  const { verificationPhoneNumber, pendingOtpData } = storeToRefs(store);
  const { sendSmsCode } = useAuthPhoneApi();

  const isLoading = ref(false);

  async function submitPhone() {
    const phoneNumber = verificationPhoneNumber.value.internationalPhoneNumber;
    if (phoneNumber === "") return;

    isLoading.value = true;
    try {
      const response = await sendSmsCode({
        phoneNumber,
        defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
        isRequestingNewCode: false,
      });
      if (response.status === "success") {
        const data = authenticate200.parse(response.data);
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
              await submitPhoneWithOverwrite(phoneNumber);
              break;
            case "throttled":
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
      isLoading.value = false;
    }
  }

  async function submitPhoneWithOverwrite(phoneNumber: string) {
    const response = await sendSmsCode({
      phoneNumber,
      defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
      isRequestingNewCode: false,
      keyAction: "overwrite",
    });
    if (response.status === "success") {
      const data = authenticate200.parse(response.data);
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

  return { isLoading, submitPhone };
}
