import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPhoneVerification } from "../api/phoneVerification";
import { storeToRefs } from "pinia";

export function useSkipAuth() {
  const {
    isAuthenticated,
    verificationPhoneNumber,
    verificationDefaultCallingCode,
  } = storeToRefs(useAuthenticationStore());
  const phoneVerification = useBackendPhoneVerification();

  async function skipEverything() {
    verificationPhoneNumber.value = "+33612345678";
    verificationDefaultCallingCode.value = "33";

    const requestCodeResponse = await phoneVerification.requestCode({
      isRequestingNewCode: false,
      phoneNumber: verificationPhoneNumber.value,
      defaultCallingCode: verificationDefaultCallingCode.value,
    });
    if (requestCodeResponse.success) {
      await phoneVerification.submitCode(0);
      isAuthenticated.value = true;
      return true;
    } else {
      console.log("Failed to request code");
      if (requestCodeResponse.reason == "already_logged_in") {
        console.log("Already logged in");
        isAuthenticated.value = true;
        return true;
      } else if (requestCodeResponse.reason == "throttled") {
        console.log("Throttled please try again later");
        return false;
      }
    }
  }

  return { skipEverything };
}
