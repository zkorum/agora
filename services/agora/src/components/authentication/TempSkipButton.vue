<template>
  <ZKButton
    outline
    label="Verify"
    text-color="color-text-strong"
    @click="skipButton()"
  />
</template>

<script setup lang="ts">
import { useAuthenticationStore } from "src/stores/authentication";
import { useRouter } from "vue-router";
import ZKButton from "../ui-library/ZKButton.vue";
import { useBackendPhoneVerification } from "src/utils/api/phoneVerification";
import { storeToRefs } from "pinia";

const router = useRouter();
const {
  isAuthenticated,
  verificationPhoneNumber,
  verificationDefaultCallingCode,
} = storeToRefs(useAuthenticationStore());
const phoneVerification = useBackendPhoneVerification();

async function skipButton() {
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
    router.push({ name: "verification-successful" });
  } else {
    console.log("Failed to request code");
    switch (requestCodeResponse.reason) {
      case "already_logged_in":
        console.log("Already logged in");
        isAuthenticated.value = true;
        router.push({ name: "verification-successful" });
        break;
      case "throttled":
        console.log("Throttled please try again later");
        break;
    }
  }
}
</script>
