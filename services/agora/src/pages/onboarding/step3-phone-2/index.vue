<template>
  <div>
    <form class="formStyle" @submit.prevent="">
      <StepperLayout
        :submit-call-back="nextButtonClicked"
        :current-step="3.5"
        :total-steps="5"
        :enable-next-button="verificationCode.length == 6"
        :show-next-button="true"
      >
        <template #header>
          <InfoHeader
            title="Enter the 6-digit code"
            description=""
            icon-name="mdi-phone"
          />
        </template>

        <template #body>
          <div class="instructions">
            Please enter the 6-digit code that was sent to
            <span class="phoneNumberStyle">{{
              verificationPhoneNumber.phoneNumber
            }}</span
            >.
          </div>

          <div class="otpDiv">
            <div class="codeInput">
              <InputOtp v-model="verificationCode" :length="6" integer-only />
            </div>

            <div
              v-if="verificationCodeExpirySeconds != 0"
              class="weakColor codeExpiry"
            >
              Expires in {{ verificationCodeExpirySeconds }}s
            </div>

            <div
              v-if="verificationCodeExpirySeconds == 0"
              class="weakColor codeExpiry"
            >
              Code expired
            </div>
          </div>

          <div class="optionButtons">
            <ZKButton
              label="Change Number"
              text-color="blue"
              @click="changePhoneNumber()"
            />

            <ZKButton
              :label="
                verificationNextCodeSeconds > 0
                  ? 'Resend Code in ' + verificationNextCodeSeconds + 's'
                  : 'Resend Code'
              "
              :disabled="verificationNextCodeSeconds > 0"
              text-color="blue"
              @click="clickedResendButton()"
            />
          </div>
        </template>
      </StepperLayout>
    </form>
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { onMounted, ref } from "vue";
import InputOtp from "primevue/inputotp";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";
import { useBackendPhoneVerification } from "src/utils/api/phoneVerification";
import { useDialog } from "src/utils/ui/dialog";
import type { ApiV1AuthAuthenticatePost200Response } from "src/api";
import { useAuthSetup } from "src/utils/auth/setup";
import { onboardingFlowStore } from "src/stores/onboarding/flow";

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const verificationCode = ref("");

const verificationNextCodeSeconds = ref(0);
const verificationCodeExpirySeconds = ref(0);

const router = useRouter();
const dialog = useDialog();

const { userLogin } = useAuthSetup();

const { requestCode, submitCode } = useBackendPhoneVerification();

const { onboardingMode } = onboardingFlowStore();

onMounted(() => {
  if (verificationPhoneNumber.value.phoneNumber == "") {
    changePhoneNumber();
  } else {
    requestCodeClicked(false);
  }
});

function clickedResendButton() {
  verificationCode.value = "";
  requestCodeClicked(true);
}

async function nextButtonClicked() {
  const response = await submitCode(Number(verificationCode.value));
  if (response) {
    if (onboardingMode == "LOGIN") {
      router.push({ name: "default-home-feed" });
    } else {
      router.push({ name: "onboarding-step4-username" });
    }
  } else {
    dialog.showMessage("Authentication", "Invalid code");
  }
}

async function requestCodeClicked(isRequestingNewCode: boolean) {
  const response = await requestCode({
    isRequestingNewCode: isRequestingNewCode,
    phoneNumber: verificationPhoneNumber.value.phoneNumber,
    defaultCallingCode: verificationPhoneNumber.value.defaultCallingCode,
  });

  if (response.isSuccessful) {
    processRequestCodeResponse(response.data);
  } else {
    if (response.error == "already_logged_in") {
      await userLogin();
      router.push({ name: "default-home-feed" });
    } else if (response.error == "throttled") {
      processRequestCodeResponse(response.data);
      dialog.showMessage(
        "Authentication",
        "Too many attempts. Please wait before requesting a new code"
      );
    } else {
      // do nothing
    }
  }
}

function processRequestCodeResponse(
  data: ApiV1AuthAuthenticatePost200Response | null
) {
  if (data == null) {
    console.log("Null data from request code response");
    return;
  }

  {
    const nextCodeSoonestTime = new Date(data.nextCodeSoonestTime);
    const now = new Date();

    const diff = nextCodeSoonestTime.getTime() - now.getTime();
    const nextCodeSecondsWait = Math.round(diff / 1000);

    verificationNextCodeSeconds.value = nextCodeSecondsWait;
    decrementNextCodeTimer();
  }

  {
    const codeExpiryTime = new Date(data.codeExpiry);
    const now = new Date();

    const diff = codeExpiryTime.getTime() - now.getTime();
    const codeExpirySeconds = Math.round(diff / 1000);

    verificationCodeExpirySeconds.value = codeExpirySeconds;
    decrementCodeExpiryTimer();
  }
}

function decrementCodeExpiryTimer() {
  verificationCodeExpirySeconds.value -= 1;
  if (verificationCodeExpirySeconds.value != 0) {
    setTimeout(function () {
      decrementCodeExpiryTimer();
    }, 1000);
  }
}

function decrementNextCodeTimer() {
  verificationNextCodeSeconds.value -= 1;
  if (verificationNextCodeSeconds.value != 0) {
    setTimeout(function () {
      decrementNextCodeTimer();
    }, 1000);
  }
}

function changePhoneNumber() {
  history.back();
}
</script>

<style scoped lang="scss">
.formStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.instructions {
  font-size: 1.1rem;
}

.phoneNumberStyle {
  font-weight: bold;
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
  justify-content: space-between;
}
</style>
