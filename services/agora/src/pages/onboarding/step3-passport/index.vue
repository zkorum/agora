<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: true,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasSettingsButton: false,
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
    <StepperLayout
      :submit-call-back="() => {}"
      :current-step="3"
      :total-steps="5"
      :enable-next-button="true"
      :show-next-button="false"
    >
      <template #header>
        <InfoHeader
          title="Own Your Privacy"
          :description="description"
          icon-name="mdi-wallet"
        />
      </template>

      <template #body>
        <ZKCard padding="1rem">
          <div class="stepContainer">
            <div class="stepFlex">
              <q-icon name="mdi-numeric-1" size="2rem" class="numberCircle" />
              <div>
                Download
                <span v-if="quasar.platform.is.mobile">
                  <a
                    :href="rarimeStoreLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    >RariMe</a
                  >
                </span>
                <span v-if="!quasar.platform.is.mobile"
                  ><a
                    :href="rarimeStoreLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    >RariMe</a
                  >
                  on your phone
                </span>
              </div>
            </div>

            <div class="stepFlex">
              <q-icon name="mdi-numeric-2" size="2rem" class="numberCircle" />
              Claim your anonymous ID on RariMe
            </div>
            <div class="stepFlex">
              <q-icon name="mdi-numeric-3" size="2rem" class="numberCircle" />
              <div v-if="quasar.platform.is.mobile">
                Come back here and click verify
              </div>
              <div v-else>
                Scan the QR code with RariMe to verify your identity
              </div>
            </div>

            <div class="innerInstructions">
              <div v-if="!quasar.platform.is.mobile">
                <div v-if="verificationLink.length == 0">
                  <div
                    v-if="verificationLinkGenerationFailed"
                    class="verificationFailure"
                  >
                    <q-icon name="mdi-alert-box" size="3rem" />
                    Failed to generate verification link
                  </div>
                  <div
                    v-if="!verificationLinkGenerationFailed"
                    class="verificationLoadingSpinner"
                  >
                    <q-spinner color="primary" size="3em" />
                    <div :style="{ fontSize: '0.8rem' }">
                      Loading verification link
                    </div>
                  </div>
                </div>

                <div
                  v-if="verificationLink.length != 0"
                  class="verificationProcedureBlock"
                >
                  <img :src="qrcode" alt="QR Code" />
                  <div>
                    Or open the below link on your mobile browser (Safari or
                    Firefox):
                  </div>
                  <!-- make this copyable -->
                  <div class="longUrl">{{ verificationLink }}</div>

                  <ZKButton
                    label="Copy"
                    icon="mdi-content-copy"
                    @click="copyVerificationLink()"
                  />
                  <div class="waitingVerificationText">
                    Waiting for verification...
                  </div>
                </div>
              </div>

              <div
                v-if="quasar.platform.is.mobile"
                class="verificationProcedureBlock"
              >
                <ZKButton
                  label="Verify"
                  color="primary"
                  @click="clickedVerifyButton()"
                />
                <div class="waitingVerificationText">
                  Waiting for verification...
                </div>
              </div>
            </div>
          </div>
        </ZKCard>

        <ZKButton
          label="I'd rather verify with my phone number"
          text-color="color-text-strong"
          @click="goToPhoneVerification()"
        />
      </template>
    </StepperLayout>
  </MainLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useQuasar } from "quasar";
import { useQRCode } from "@vueuse/integrations/useQRCode";
import { useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useAuthSetup } from "src/utils/auth/setup";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api/api";
import { useCommonApi, type KeyAction } from "src/utils/api/common";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { onUnmounted } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import MainLayout from "src/layouts/MainLayout.vue";

const description =
  "RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you’re a unique human without sharing any personal data with anyone.";

const quasar = useQuasar();

const router = useRouter();

const { share } = useWebShare();

const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();

let isDeviceLoggedInIntervalId: number | undefined = undefined;
const verificationLink = ref("");

const qrcode = useQRCode(verificationLink);

const { userLogin } = useAuthSetup();

const rarimeStoreLink = ref("");

const verificationLinkGenerationFailed = ref(false);

const { onboardingMode } = onboardingFlowStore();

if (quasar.platform.is.android) {
  rarimeStoreLink.value =
    "https://play.google.com/store/apps/details?id=com.rarilabs.rarime";
} else if (quasar.platform.is.ios) {
  rarimeStoreLink.value = "https://apps.apple.com/us/app/rarime/id6503300598";
} else {
  rarimeStoreLink.value = "https://rarime.com/";
}

async function generateVerificationLink(keyAction?: KeyAction) {
  try {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthZkpGenerateVerificationLinkPost();
    const encodedUcan = await buildEncodedUcan(url, options, keyAction);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthZkpGenerateVerificationLinkPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    if (response.data.success) {
      verificationLink.value = response.data.verificationLink;
      if (isDeviceLoggedInIntervalId === undefined) {
        isDeviceLoggedInIntervalId = window.setInterval(isDeviceLoggedIn, 2000);
      }
    } else {
      switch (response.data.reason) {
        case "already_logged_in":
          showNotifyMessage("Verification successful 🎉");
          await completeVerification();
          break;
        case "associated_with_another_user":
          // TODO: make sure we don't get in an infinite loop...! (should not happen)
          await generateVerificationLink("overwrite");
          break;
      }
    }
  } catch (e) {
    console.error("Error while fetching Rarimo verification link", e);
    showNotifyMessage("Oops! Unexpected error—try refreshing the page");
    verificationLinkGenerationFailed.value = true;
  }
}

onMounted(async () => {
  await generateVerificationLink();
});

onUnmounted(() => {
  if (isDeviceLoggedInIntervalId !== undefined) {
    clearInterval(isDeviceLoggedInIntervalId);
  }
});

async function copyVerificationLink() {
  await share("Verification Link", verificationLink.value);
}

async function isDeviceLoggedIn() {
  try {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthZkpVerifyUserStatusAndAuthenticatePost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthZkpVerifyUserStatusAndAuthenticatePost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    if (response.data.success) {
      switch (response.data.rarimoStatus) {
        case "not_verified":
          break;
        case "verified":
          await completeVerification();
          break;
        case "failed_verification":
          console.error(
            "Verification failed while verifying proof",
            response.data
          );
          break;
        case "uniqueness_check_failed":
          console.error(
            "Uniqueness-check failed while verifying proof",
            response.data
          );
          break;
      }
    } else {
      switch (response.data.reason) {
        case "already_logged_in":
          await completeVerification();
          break;
        case "associated_with_another_user":
          // This did:key belongs to another phone number / nullifier.
          // Something wrong probably happened during keystore eviction on log out.
          // Retry, and this time overwrite the existing key with a new one.
          window.clearInterval(isDeviceLoggedInIntervalId);
          await generateVerificationLink("overwrite");
          showNotifyMessage(
            "Oops! Sync hiccup detected. We've refreshed your QR code—try scanning it again!"
          );
          break;
      }
    }
  } catch (e) {
    // TODO: handle connection error with just ONE app-wide meaningful "verify"
    console.error("Error while verifying proof", e);
    showNotifyMessage("Failed to verify identity proof");
  }
}

async function clickedVerifyButton() {
  window.open(verificationLink.value, "_blank");
}

async function completeVerification() {
  window.clearInterval(isDeviceLoggedInIntervalId);
  showNotifyMessage("Verification successful 🎉");
  await userLogin();

  if (onboardingMode == "LOGIN") {
    await router.push({ name: "/" });
  } else {
    await router.push({ name: "/onboarding/step4-username/" });
  }
}

async function goToPhoneVerification() {
  await router.push({ name: "/onboarding/step3-phone-1/" });
}
</script>

<style scoped lang="scss">
.stepContainer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  justify-content: center;
}

.stepFlex {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.innerInstructions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.numberCircle {
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  background: #fff;
  border: 2px solid black;
  color: black;
  text-align: center;
}

.verificationLoadingSpinner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.verificationFailure {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  font-size: 0.8rem;
}

.longUrl {
  width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-family: monospace;
}

.verificationProcedureBlock {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.waitingVerificationText {
  text-align: center;
  font-size: 0.9rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
</style>
