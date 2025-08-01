<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <form class="formStyle" @submit.prevent="nextButtonClicked">
        <StepperLayout
          :submit-call-back="nextButtonClicked"
          :current-step="3.5"
          :total-steps="5"
          :enable-next-button="verificationCode.length == 6"
          :show-next-button="true"
          :show-loading-button="isSubmitButtonLoading"
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
              Enter the 6-digit that we have sent via the phone number
              <span class="phoneNumberStyle">{{ formattedPhoneNumber }}</span
              >.
            </div>

            <div class="otpDiv">
              <div class="codeInput">
                <PrimeInputOtp
                  v-model="verificationCode"
                  :length="6"
                  integer-only
                />
              </div>

              <div
                v-if="verificationCodeExpirySeconds > 0"
                class="weakColor codeExpiry"
              >
                Expires in {{ verificationCodeExpirySeconds }}s
              </div>

              <div
                v-if="verificationCodeExpirySeconds <= 0"
                class="weakColor codeExpiry"
              >
                Code expired
              </div>
            </div>

            <div class="optionButtons">
              <ZKButton
                button-type="largeButton"
                label="Change Number"
                text-color="primary"
                @click="changePhoneNumber()"
              />

              <ZKButton
                button-type="largeButton"
                :label="
                  verificationNextCodeSeconds > 0
                    ? 'Resend Code in ' + verificationNextCodeSeconds + 's'
                    : 'Resend Code'
                "
                :disable="verificationNextCodeSeconds > 0"
                text-color="primary"
                @click="clickedResendButton()"
              />
            </div>
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { storeToRefs } from "pinia";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { onMounted, ref, computed } from "vue";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";
import { type ApiV1AuthAuthenticatePost200Response } from "src/api";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import type { KeyAction } from "src/utils/api/common";
import { useNotify } from "src/utils/ui/notify";
import { createDidOverwriteIfAlreadyExists } from "src/utils/crypto/ucan/operation";
import { useQuasar } from "quasar";
import { getPlatform } from "src/utils/common";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";

const $q = useQuasar();
let platform: "mobile" | "web" = "web";
platform = getPlatform($q.platform);

const { verificationPhoneNumber } = storeToRefs(phoneVerificationStore());

const verificationCode = ref("");

const verificationNextCodeSeconds = ref(0);
const verificationCodeExpirySeconds = ref(0);
let nextCodeTimerId: ReturnType<typeof setTimeout> | undefined = undefined;
let codeExpiryTimerId: ReturnType<typeof setTimeout> | undefined = undefined;

const router = useRouter();

const { updateAuthState } = useBackendAuthApi();

const { sendSmsCode, verifyPhoneOtp } = useBackendAuthApi();

const { onboardingMode } = onboardingFlowStore();

const { showNotifyMessage } = useNotify();

const { routeUserAfterLogin } = useLoginIntentionStore();

const isSubmitButtonLoading = ref(false);

const formattedPhoneNumber = computed(() => {
  if (!verificationPhoneNumber.value.internationalPhoneNumber) return "";

  const parsed = parsePhoneNumberFromString(
    verificationPhoneNumber.value.internationalPhoneNumber
  );
  return (
    parsed?.formatInternational() ||
    verificationPhoneNumber.value.internationalPhoneNumber
  );
});

function validateAndParseOtpCode(code: string): number | null {
  const trimmedCode = code.trim();

  // Check if exactly 6 digits
  if (!/^\d{6}$/.test(trimmedCode)) {
    return null;
  }

  const numericCode = parseInt(trimmedCode, 10);

  if (isNaN(numericCode)) {
    return null;
  }

  return numericCode;
}

onMounted(async () => {
  if (verificationPhoneNumber.value.internationalPhoneNumber == "") {
    await changePhoneNumber();
  } else {
    await requestCodeClicked(false);
  }
});

async function clickedResendButton() {
  verificationCode.value = "";
  await requestCodeClicked(true);
}

async function nextButtonClicked() {
  isSubmitButtonLoading.value = true;

  const validatedCode = validateAndParseOtpCode(verificationCode.value);

  if (validatedCode === null) {
    isSubmitButtonLoading.value = false;
    showNotifyMessage("Please enter a valid 6-digit code");
    return;
  }

  const response = await verifyPhoneOtp({
    code: validatedCode,
    phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
    defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
  });

  isSubmitButtonLoading.value = false;

  if (response.status == "success") {
    if (response.data.success) {
      showNotifyMessage("Verification successful 🎉");
      await updateAuthState({
        partialLoginStatus: { isLoggedIn: true },
        forceRefresh: true,
      });
      if (onboardingMode == "LOGIN") {
        await routeUserAfterLogin();
      } else {
        await router.push({ name: "/onboarding/step4-username/" });
      }
    } else {
      switch (response.data.reason) {
        case "expired_code":
          codeExpired();
          showNotifyMessage("Code expired—resend a new code");
          break;
        case "wrong_guess":
          showNotifyMessage("Wrong code—try again");
          break;
        case "too_many_wrong_guess":
          codeExpired();
          showNotifyMessage("Code expired—resend a new code");
          break;
        case "already_logged_in":
          showNotifyMessage("Verification successful 🎉");
          await updateAuthState({
            partialLoginStatus: { isLoggedIn: true },
            forceRefresh: true,
          });
          if (onboardingMode == "LOGIN") {
            await routeUserAfterLogin();
          } else {
            await router.push({ name: "/onboarding/step4-username/" });
          }
          break;
        case "associated_with_another_user": {
          showNotifyMessage("Oops! Sync hiccup detected—resend a new code");
          // overwrite key but don't send a request
          await createDidOverwriteIfAlreadyExists(platform);
        }
      }
    }
  } else {
    console.error("Error while verifying code", response.message);
    showNotifyMessage("Oops! Something is wrong");
  }
}

async function requestCodeClicked(
  isRequestingNewCode: boolean,
  keyAction?: KeyAction
) {
  const response = await sendSmsCode({
    isRequestingNewCode: isRequestingNewCode,
    phoneNumber: verificationPhoneNumber.value.internationalPhoneNumber,
    defaultCallingCode: verificationPhoneNumber.value.countryCallingCode,
    keyAction: keyAction,
  });
  if (response.status == "success") {
    if (response.data.success) {
      processRequestCodeResponse(response.data);
    } else {
      switch (response.data.reason) {
        case "already_logged_in":
          showNotifyMessage("Verification successful 🎉");
          await updateAuthState({
            partialLoginStatus: { isLoggedIn: true },
            forceRefresh: true,
          });
          if (onboardingMode == "LOGIN") {
            await routeUserAfterLogin();
          } else {
            await router.push({ name: "/onboarding/step4-username/" });
          }
          break;
        case "associated_with_another_user":
          // retry by overwriting key
          await requestCodeClicked(isRequestingNewCode, "overwrite");
          break;
        case "throttled":
          processRequestCodeResponse(response.data);
          showNotifyMessage(
            "Too many attempts—please wait before requesting a new code"
          );
          break;
        case "invalid_phone_number":
          processRequestCodeResponse(response.data);
          showNotifyMessage(
            "Sorry, this phone number is invalid. Please check and try again."
          );
          break;
        case "restricted_phone_type":
          processRequestCodeResponse(response.data);
          showNotifyMessage(
            "Sorry, this phone number is not supported for security reasons. Please try another."
          );
          break;
      }
    }
  } else {
    console.error("Error while requesting a code", response.message);
    showNotifyMessage("Oops! Something is wrong");
  }
}

function codeExpired() {
  verificationCodeExpirySeconds.value = 0;
}

function processRequestCodeResponse(
  data: ApiV1AuthAuthenticatePost200Response
) {
  const nowMinusMinusOneSecond = new Date();
  nowMinusMinusOneSecond.setSeconds(nowMinusMinusOneSecond.getSeconds() - 1); // this is to avoid rounding errors that make us wait 9 seconds instead of 10
  {
    const nextCodeSoonestTime = new Date(data.nextCodeSoonestTime);

    const diff =
      nextCodeSoonestTime.getTime() - nowMinusMinusOneSecond.getTime();
    const nextCodeSecondsWait = Math.ceil(diff / 1000);

    verificationNextCodeSeconds.value = nextCodeSecondsWait;
    decrementNextCodeTimer();
  }

  {
    const codeExpiryTime = new Date(data.codeExpiry);

    const diff = codeExpiryTime.getTime() - nowMinusMinusOneSecond.getTime();
    const codeExpirySeconds = Math.ceil(diff / 1000);

    verificationCodeExpirySeconds.value = codeExpirySeconds;
    decrementCodeExpiryTimer();
  }
}

function decrementCodeExpiryTimer() {
  clearTimeout(codeExpiryTimerId);
  if (verificationCodeExpirySeconds.value <= 0) {
    verificationCodeExpirySeconds.value = 0;
    return;
  }
  verificationCodeExpirySeconds.value -= 1;
  if (verificationCodeExpirySeconds.value > 0) {
    codeExpiryTimerId = setTimeout(function () {
      decrementCodeExpiryTimer();
    }, 1000);
  }
}

function decrementNextCodeTimer() {
  clearTimeout(nextCodeTimerId);
  if (verificationNextCodeSeconds.value <= 0) {
    verificationNextCodeSeconds.value = 0;
    return;
  }
  verificationNextCodeSeconds.value -= 1;
  if (verificationNextCodeSeconds.value > 0) {
    nextCodeTimerId = setTimeout(function () {
      decrementNextCodeTimer();
    }, 1000);
  }
}

async function changePhoneNumber() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
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
  font-weight: 500;
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
