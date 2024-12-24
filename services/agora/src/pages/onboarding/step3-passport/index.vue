<template>
  <div>
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
  </div>
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
import { useCommonApi } from "src/utils/api/common";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { onUnmounted } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { onboardingFlowStore } from "src/stores/onboarding/flow";

const description =
  "RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you’re a unique human without sharing any personal data with anyone.";

const quasar = useQuasar();

const router = useRouter();

const { share } = useWebShare();

const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();

let isDidLoggedInIntervalId: number | undefined = undefined;
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

onMounted(async () => {
  try {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1RarimoGenerateVerificationLinkPost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1RarimoGenerateVerificationLinkPost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    verificationLink.value = response.data.verificationLink;

    isDidLoggedInIntervalId = window.setInterval(isDidLoggedIn, 2000);
  } catch (e) {
    console.error(e);
    showNotifyMessage(
      "Failed to fetch RariMe verification link: try refreshing the page"
    );
    verificationLinkGenerationFailed.value = true;
  }
});

onUnmounted(() => {
  if (isDidLoggedInIntervalId !== undefined) {
    clearInterval(isDidLoggedInIntervalId);
  }
});

function copyVerificationLink() {
  share("Verification Link", verificationLink.value);
}

async function isDidLoggedIn() {
  try {
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1RarimoVerifyUserStatusAndAuthenticatePost();
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1RarimoVerifyUserStatusAndAuthenticatePost({
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    if (response.data.rarimoStatus === "verified") {
      await completeVerification();
    } else {
      console.log(response.data.rarimoStatus);
    }
  } catch (e) {
    console.error(e);
    showNotifyMessage("Failed to verify identity proof");
  }
}

async function clickedVerifyButton() {
  window.open(verificationLink.value, "_blank");
}

async function completeVerification() {
  showNotifyMessage("Verification successful 🎉");
  await userLogin();

  if (onboardingMode == "LOGIN") {
    router.push({ name: "default-home-feed" });
  } else {
    router.push({ name: "onboarding-step4-username" });
  }
}

function goToPhoneVerification() {
  router.push({ name: "onboarding-step3-phone-1" });
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
