<template>
  <OnboardingLayout>
    <template #body>
      <RarimoImageExample />
    </template>

    <template #footer>
      <WidthWrapper :enable="true">
        <StepperLayout
          :submit-call-back="() => {}"
          :current-step="3"
          :total-steps="5"
          :enable-next-button="true"
          :show-next-button="false"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('pageTitle')"
              :description="t('description')"
              icon-name="mdi-wallet"
            />
          </template>

          <template #body>
            <ZKCard padding="1rem" class="cardBackground">
              <div class="stepContainer">
                <div class="stepFlex">
                  <q-icon
                    name="mdi-numeric-1"
                    size="2rem"
                    class="numberCircle"
                  />
                  <div>
                    {{ t("download") }}
                    <span v-if="quasar.platform.is.mobile">
                      <a
                        class="hrefColor"
                        :href="rarimeStoreLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        >RariMe</a
                      >
                    </span>
                    <span v-if="!quasar.platform.is.mobile"
                      ><a
                        class="hrefColor"
                        :href="rarimeStoreLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        >RariMe</a
                      >
                    </span>
                  </div>
                </div>

                <div class="stepFlex">
                  <q-icon
                    name="mdi-numeric-2"
                    size="2rem"
                    class="numberCircle"
                  />
                  {{ t("claimAnonymousId") }}
                </div>
                <div class="stepFlex">
                  <q-icon
                    name="mdi-numeric-3"
                    size="2rem"
                    class="numberCircle"
                  />
                  <div v-if="quasar.platform.is.mobile">
                    {{ t("comeBackAndVerify") }}
                  </div>
                  <div v-else>
                    {{ t("scanQrCode") }}
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
                        {{ t("failedToGenerateLink") }}
                      </div>
                      <div
                        v-if="!verificationLinkGenerationFailed"
                        class="verificationLoadingSpinner"
                      >
                        <q-spinner color="primary" size="3em" />
                        <div :style="{ fontSize: '0.8rem' }">
                          {{ t("loadingVerificationLink") }}
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="verificationLink.length != 0"
                      class="verificationProcedureBlock"
                    >
                      <img :src="qrcode" alt="QR Code" />
                      <div>{{ t("openLinkOnMobile") }}</div>
                      <!-- make this copyable -->
                      <div class="longUrl">{{ verificationLink }}</div>

                      <ZKButton
                        button-type="standardButton"
                        :label="t('copy')"
                        icon="mdi-content-copy"
                        @click="copyVerificationLink()"
                      />
                      <div class="waitingVerificationText">
                        {{ t("waitingForVerification") }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="quasar.platform.is.mobile"
                    class="verificationProcedureBlock"
                  >
                    <ZKButton
                      button-type="largeButton"
                      :label="t('verify')"
                      color="primary"
                      :loading="verificationLink === ''"
                      @click="clickedVerifyButton()"
                    />
                    <div class="waitingVerificationText">
                      {{ t("waitingForVerification") }}
                    </div>
                  </div>
                </div>
              </div>
            </ZKCard>

            <ZKButton
              button-type="largeButton"
              :label="t('preferPhoneVerification')"
              text-color="primary"
              @click="goToPhoneVerification()"
            />
          </template>
        </StepperLayout>
      </WidthWrapper>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useQuasar } from "quasar";
import { useQRCode } from "@vueuse/integrations/useQRCode";
import { useRouter } from "vue-router";
import { onMounted, ref, watch } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api/api";
import { useCommonApi, type KeyAction } from "src/utils/api/common";
import { api } from "src/boot/axios";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { onUnmounted } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import RarimoImageExample from "src/components/onboarding/backgrounds/RarimoImageExample.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import type { LinkType, RarimoStatusAttributes } from "src/shared/types/zod";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  passportOnboardingTranslations,
  type PassportOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<PassportOnboardingTranslations>(
  passportOnboardingTranslations
);

const quasar = useQuasar();

const router = useRouter();

const { share } = useWebShare();

const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();

let isDeviceLoggedInIntervalId: number | undefined = undefined;
const verificationLink = ref<string>("");

const qrcode = useQRCode(verificationLink);
const qrcodeVerificationStatus = ref<RarimoStatusAttributes>("not_verified");

const { updateAuthState } = useBackendAuthApi();

const rarimeStoreLink = ref("");

const verificationLinkGenerationFailed = ref(false);

const { onboardingMode } = onboardingFlowStore();
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

if (quasar.platform.is.android) {
  rarimeStoreLink.value =
    "https://play.google.com/store/apps/details?id=com.rarilabs.rarime";
} else if (quasar.platform.is.ios) {
  rarimeStoreLink.value = "https://apps.apple.com/us/app/rarime/id6503300598";
} else {
  rarimeStoreLink.value = "https://rarime.com/";
}

async function generateVerificationLink(keyAction?: KeyAction) {
  const linkType: LinkType = "http";
  try {
    const params = { linkType: linkType };
    const { url, options } =
      await DefaultApiAxiosParamCreator().apiV1AuthZkpGenerateVerificationLinkPost(
        params
      );
    const encodedUcan = await buildEncodedUcan(url, options, keyAction);
    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1AuthZkpGenerateVerificationLinkPost(params, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
      },
    });
    if (response.data.success) {
      verificationLink.value = response.data.verificationLink;
      if (isDeviceLoggedInIntervalId === undefined) {
        isDeviceLoggedInIntervalId = window.setInterval(
          () => void isDeviceLoggedIn(),
          2000
        );
      } else {
        window.clearInterval(isDeviceLoggedInIntervalId);
        isDeviceLoggedInIntervalId = window.setInterval(
          () => void isDeviceLoggedIn(),
          2000
        );
      }
    } else {
      switch (response.data.reason) {
        case "already_logged_in":
          qrcodeVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          // TODO: make sure we don't get in an infinite loop...! (should not happen)
          await generateVerificationLink("overwrite");
          break;
      }
    }
  } catch (e) {
    console.error("Error while fetching Rarimo verification link", e);
    showNotifyMessage(t("unexpectedError"));
    verificationLinkGenerationFailed.value = true;
  }
}

const { routeUserAfterLogin } = useLoginIntentionStore();

onMounted(async () => {
  await initialize();
});

watch(isAuthInitialized, async () => {
  await initialize();
});

async function initialize() {
  if (isAuthInitialized.value) {
    await generateVerificationLink();
  }
}

watch(qrcodeVerificationStatus, async () => {
  switch (qrcodeVerificationStatus.value) {
    case "not_verified":
      break;
    case "verified":
      await completeVerification();
      break;
    case "failed_verification":
      showNotifyMessage(t("verificationFailed"));
      break;
    case "uniqueness_check_failed":
      showNotifyMessage(t("passportAlreadyLinked"));
      break;
  }
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
          qrcodeVerificationStatus.value = "not_verified";
          break;
        case "verified":
          qrcodeVerificationStatus.value = "verified";
          break;
        case "failed_verification":
          qrcodeVerificationStatus.value = "failed_verification";
          break;
        case "uniqueness_check_failed":
          qrcodeVerificationStatus.value = "uniqueness_check_failed";
          break;
      }
    } else {
      switch (response.data.reason) {
        case "already_logged_in":
          qrcodeVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          // This did:key belongs to another phone number / nullifier.
          // Something wrong probably happened during keystore eviction on log out.
          // Retry, and this time overwrite the existing key with a new one.
          window.clearInterval(isDeviceLoggedInIntervalId);
          showNotifyMessage(t("syncHiccup"));
          await generateVerificationLink("overwrite");
          break;
      }
    }
  } catch (e) {
    console.error("Error while verifying proof", e);
    qrcodeVerificationStatus.value = "failed_verification";
  }
}

function clickedVerifyButton() {
  window.open(verificationLink.value, "_blank", "noopener, noreferrer");
}

async function completeVerification() {
  window.clearInterval(isDeviceLoggedInIntervalId);
  showNotifyMessage(t("verificationSuccessful"));
  await updateAuthState({
    partialLoginStatus: { isLoggedIn: true },
    forceRefresh: true,
  });

  if (onboardingMode == "LOGIN") {
    await routeUserAfterLogin();
  } else {
    await router.push({ name: "/onboarding/step4-username/" });
  }
}

async function goToPhoneVerification() {
  await router.replace({ name: "/onboarding/step3-phone-1/" });
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
  width: 100%;
}

.waitingVerificationText {
  text-align: center;
  font-size: 0.9rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.whiteBackground {
  background-color: white;
}

.hrefColor {
  color: $primary;
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
}

.cardBackground {
  background-color: $app-background-color;
}
</style>
