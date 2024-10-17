import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useRouter } from "vue-router";

export function useEmailVerification() {

  const { emailCode, sendEmailCode } = useBackendAuthApi();

  const { isAuthenticated } = storeToRefs(useAuthenticationStore());

  const router = useRouter();

  async function submitCode(code: number) {

    if (process.env.USE_DUMMY_ACCESS == "true") {
      code = 0;
    }

    const response = await emailCode(code);
    if (response.data.success) {
      isAuthenticated.value = true;
      router.push({ name: "verification-options" });
    } else {
      console.log("Failed to submit email verification code");
      console.log(response.data.reason);
    }
  }

  async function requestCode(isRequestingNewCode: boolean, emailAddress: string) {
    const response = await sendEmailCode(emailAddress, isRequestingNewCode);
    return response;
  }

  return { submitCode, requestCode };

}
