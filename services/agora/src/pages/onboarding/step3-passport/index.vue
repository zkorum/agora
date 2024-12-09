<template>
  <div>
    <StepperLayout :submit-call-back="() => { }" :current-step="3" :total-steps="6" :enable-next-button="true"
      :show-next-button="false">
      <template #header>
        <InfoHeader title="Own Your Privacy" :description="description" icon-name="mdi-wallet" />
      </template>

      <template #body>
        <ZKCard padding="1.5rem">
          <div class="stepContainer">
            <div class="stepFlex">
              <q-icon name="mdi-numeric-1" size="2rem" class="numberCircle" />
              Use the following deep link to download RariMe app
            </div>

            <div class="innerInstructions">
              <img v-if="!quasar.platform.is.mobile" :src="qrcode" alt="QR Code" class="qrCode" />

              <a :href="rarimeLink" target="_blank" rel="noopener noreferrer">
                <ZKButton icon="mdi-open-in-new" label="Open RariMe" color="secondary"
                  @click="completeVerification()" />
              </a>
            </div>

            <div class="stepFlex">
              <q-icon name="mdi-numeric-2" size="2rem" class="numberCircle" />
              Claim your anonymous ID on RariMe
            </div>
            <div class="stepFlex">
              <q-icon name="mdi-numeric-3" size="2rem" class="numberCircle" />
              Come back here and click verify
            </div>

            <ZKButton label="Verify" color="primary" @click="clickedVerifyButton()" />
          </div>
        </ZKCard>

        <ZKButton label="I'd rather verify with my phone number" text-color="color-text-strong"
          @click="goToPhoneVerification()" />
      </template>
    </StepperLayout>
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useQuasar } from "quasar";
import { useQRCode } from "@vueuse/integrations/useQRCode.mjs";
import { useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useSkipAuth } from "src/utils/auth/skipAuth";
import { useAuthSetup } from "src/utils/auth/setup";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api/api";
import { useCommonApi } from "src/utils/api/common";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";

const description =
  "RariMe is a ZK-powered identity wallet that converts your passport into an anonymous digital ID, stored on your device, so you can prove that you’re a unique human without sharing any personal data with anyone.";

const quasar = useQuasar();

const router = useRouter();

const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();
const rarimeLink = ref("");
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
    rarimeLink.value = response.data.verificationLink;
  } catch (e) {
    console.error(e);
    showNotifyMessage("Failed to Rarimo verification link");
  }
});

const { userLogin } = useAuthSetup();

const { skipEverything } = useSkipAuth();

async function clickedVerifyButton() {
  const result = await skipEverything();
  if (result) {
    await userLogin();
    router.push({ name: "onboarding-step4-username" });
  }
}

if (quasar.platform.is.android) {
  rarimeLink.value =
    "https://play.google.com/store/apps/details?id=com.rarilabs.rarime";
} else if (quasar.platform.is.ios) {
  rarimeLink.value = "https://apps.apple.com/us/app/rarime/id6503300598";
} else {
  rarimeLink.value = "https://rarime.com/";
}

const qrcode = useQRCode(rarimeLink, { version: "10" });

function completeVerification() {
  router.push({ name: "onboarding-step4-username" });
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
</style>
