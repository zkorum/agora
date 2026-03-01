<template>
  <OnboardingLayout>
    <template #body>
      <div class="walletHeroContainer">
        <q-icon name="mdi-wallet-outline" size="6rem" color="primary" />
      </div>
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
                <!-- Desktop: QR Code flow -->
                <div v-if="!isJomhoorWebView && !quasar.platform.is.mobile">
                  <div v-if="challenge.length === 0">
                    <div
                      v-if="challengeGenerationFailed"
                      class="verificationFailure"
                    >
                      <q-icon name="mdi-alert-box" size="3rem" />
                      {{ t("failedToGenerateChallenge") }}
                      <ZKButton
                        button-type="standardButton"
                        :label="t('retryChallenge')"
                        icon="mdi-refresh"
                        @click="retryGenerateChallenge()"
                      />
                    </div>
                    <div
                      v-if="!challengeGenerationFailed"
                      class="verificationLoadingSpinner"
                    >
                      <q-spinner color="primary" size="3em" />
                      <div :style="{ fontSize: '0.8rem' }">
                        {{ t("connectingWallet") }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="challenge.length > 0"
                    class="verificationProcedureBlock"
                  >
                    <div class="stepFlex">
                      <q-icon
                        name="mdi-numeric-1"
                        size="2rem"
                        class="numberCircle"
                      />
                      {{ t("downloadJomhoor") }}
                    </div>
                    <div class="stepFlex">
                      <q-icon
                        name="mdi-numeric-2"
                        size="2rem"
                        class="numberCircle"
                      />
                      {{ t("scanQrCode") }}
                    </div>
                    <div class="qrcodeBlock">
                      <img :src="qrcode" alt="QR Code" />
                    </div>
                    <div class="waitingVerificationText">
                      {{ t("waitingForVerification") }}
                    </div>
                  </div>
                </div>

                <!-- Mobile browser (not WebView): Show open-app button -->
                <div
                  v-if="!isJomhoorWebView && quasar.platform.is.mobile"
                  class="verificationProcedureBlock"
                >
                  <ZKButton
                    button-type="largeButton"
                    :label="t('openJomhoor')"
                    color="primary"
                    :loading="challenge === ''"
                    @click="openJomhoorApp()"
                  />
                  <div
                    v-if="challenge.length > 0"
                    class="waitingVerificationText"
                  >
                    {{ t("waitingForVerification") }}
                  </div>
                </div>

                <!-- WebView inside Jomhoor app: Auto-bridging -->
                <div
                  v-if="isJomhoorWebView"
                  class="verificationProcedureBlock"
                >
                  <div v-if="challengeGenerationFailed" class="verificationFailure">
                    <q-icon name="mdi-alert-box" size="3rem" />
                    {{ t("failedToGenerateChallenge") }}
                    <div v-if="webViewDebugError" :style="{ fontSize: '0.7rem', color: '#f44', wordBreak: 'break-all', maxWidth: '90%' }">
                      {{ webViewDebugError }}
                    </div>
                    <ZKButton
                      button-type="standardButton"
                      :label="t('retryChallenge')"
                      icon="mdi-refresh"
                      @click="retryGenerateChallenge()"
                    />
                  </div>
                  <div v-else>
                    <q-spinner color="primary" size="3em" />
                    <div :style="{ fontSize: '0.9rem' }">
                      {{ t("connectingWallet") }}
                    </div>
                    <div :style="{ fontSize: '0.7rem', color: '#888', marginTop: '0.5rem' }">
                      {{ webViewDebugStatus }}
                    </div>
                    <div class="waitingVerificationText">
                      {{ t("waitingForVerification") }}
                    </div>
                  </div>
                </div>
              </div>
            </ZKCard>
          </template>
        </StepperLayout>
      </WidthWrapper>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
/** Custom properties injected by the Jomhoor native WebView shell. */
interface JomhoorWindow extends Window {
  __JOMHOOR__?: boolean;
  ReactNativeWebView?: { postMessage(data: string): void };
}

import { useQRCode } from "@vueuse/integrations/useQRCode";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { Dto } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useBackendAuthApi } from "src/utils/api/auth";
import { api } from "src/utils/api/client";
import { type KeyAction, useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { processEnv } from "src/utils/processEnv";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type WalletOnboardingTranslations,
  walletOnboardingTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<WalletOnboardingTranslations>(
  walletOnboardingTranslations,
);

const quasar = useQuasar();
const router = useRouter();
const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();
const { updateAuthState } = useBackendAuthApi();
const { onboardingMode } = onboardingFlowStore();
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
const { routeUserAfterLogin } = useLoginIntentionStore();

// Detect if we're inside the Jomhoor app WebView
const isJomhoorWebView = computed(
  () =>
    typeof window !== "undefined" &&
    !!(window as JomhoorWindow).__JOMHOOR__,
);

const challenge = ref<string>("");
const challengeGenerationFailed = ref(false);
const accountMerged = ref(false);
const verifiedUserId = ref<string>("");
let pollIntervalId: number | undefined = undefined;

// Debug state visible in WebView UI (temporary)
const webViewDebugStatus = ref("Initializing...");
const webViewDebugError = ref("");

// Build deep link URL for QR code
const deepLink = computed(() => {
  if (!challenge.value) return "";
  const encodedChallenge = encodeURIComponent(challenge.value);
  const encodedApiUrl = encodeURIComponent(processEnv.VITE_API_BASE_URL);
  // The Jomhoor app handles this deep link scheme
  return `jomhoor://auth/agora?challenge=${encodedChallenge}&apiBaseUrl=${encodedApiUrl}`;
});

const qrcode = useQRCode(deepLink, {
  width: 218,
  margin: 1,
  color: {
    dark: "#000000",
    light: "#0000",
  },
});

type WalletVerificationStatus = "pending" | "verified" | "expired" | "failed";
const walletVerificationStatus = ref<WalletVerificationStatus>("pending");

// ─── Step 1: Generate Challenge ────────────────────────────────────────────────

async function requestChallenge(keyAction?: KeyAction) {
  try {
    webViewDebugStatus.value = "Building UCAN...";
    const url = "/api/v1/auth/wallet/generate-challenge";
    const options = { method: "post" as const };
    const encodedUcan = await buildEncodedUcan(url, options, keyAction);
    webViewDebugStatus.value = "Calling generate-challenge...";
    const response = await api.post(
      url,
      {},
      { headers: { ...buildAuthorizationHeader(encodedUcan) } },
    );
    const data = Dto.generateWalletChallenge200.parse(response.data);
    webViewDebugStatus.value = `Challenge response: success=${data.success}`;

    if (data.success) {
      challenge.value = data.challenge;
      challengeGenerationFailed.value = false;
      webViewDebugStatus.value = `Challenge OK (${data.challenge.slice(0, 8)}…), sending to native…`;

      // In WebView, send challenge to native app via postMessage
      if (isJomhoorWebView.value) {
        sendChallengeToNativeApp(data.challenge);
        webViewDebugStatus.value = `Sent to native, polling verify-status…`;
      }

      // Start polling for verification status
      startPolling();
    } else {
      switch (data.reason) {
        case "already_logged_in":
          webViewDebugStatus.value = "Already logged in!";
          walletVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          webViewDebugStatus.value = "Associated with another user, retrying…";
          await requestChallenge("overwrite");
          break;
      }
    }
  } catch (e) {
    console.error("Error generating wallet challenge", e);
    const errMsg = e instanceof Error ? e.message : String(e);
    webViewDebugError.value = errMsg;
    webViewDebugStatus.value = `Error: ${errMsg}`;
    showNotifyMessage(t("unexpectedError"));
    challengeGenerationFailed.value = true;
  }
}

function retryGenerateChallenge() {
  challengeGenerationFailed.value = false;
  void requestChallenge();
}

// ─── WebView Bridge ────────────────────────────────────────────────────────────

function sendChallengeToNativeApp(challengeToken: string) {
  // Send to React Native WebView via postMessage.
  // Include the API base URL so the native app knows where to POST the submit
  // call (the Quasar dev server and the API run on different ports in local dev).
  const jw = window as JomhoorWindow;
  if (jw.ReactNativeWebView) {
    jw.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "WALLET_CHALLENGE_REQUEST",
        challenge: challengeToken,
        apiBaseUrl: processEnv.VITE_API_BASE_URL,
      }),
    );
  }
}

// ─── Step 2b: Poll for Verification ────────────────────────────────────────────

function startPolling() {
  if (pollIntervalId !== undefined) {
    window.clearInterval(pollIntervalId);
  }
  pollIntervalId = window.setInterval(() => void pollWalletStatus(), 2000);
}

async function pollWalletStatus() {
  try {
    const url = "/api/v1/auth/wallet/verify-status";
    const options = { method: "post" as const };
    const encodedUcan = await buildEncodedUcan(url, options);
    const response = await api.post(
      url,
      {},
      { headers: { ...buildAuthorizationHeader(encodedUcan) } },
    );
    const data = Dto.walletVerifyStatus200.parse(response.data);

    if (data.success) {
      if ("walletStatus" in data) {
        webViewDebugStatus.value = `Poll: ${data.walletStatus}`;
        switch (data.walletStatus) {
          case "pending":
            // Still waiting — keep polling
            break;
          case "verified":
            walletVerificationStatus.value = "verified";
            accountMerged.value = data.accountMerged;
            verifiedUserId.value = data.userId;
            break;
          case "expired":
            walletVerificationStatus.value = "expired";
            // Auto-retry with a new challenge
            showNotifyMessage(t("challengeExpired"));
            await requestChallenge();
            break;
        }
      }
    } else {
      switch (data.reason) {
        case "already_logged_in":
          walletVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          window.clearInterval(pollIntervalId);
          showNotifyMessage(t("syncHiccup"));
          await requestChallenge("overwrite");
          break;
        case "no_challenge":
          // No challenge found — generate a new one
          await requestChallenge();
          break;
      }
    }
  } catch (e) {
    console.error("Error polling wallet status", e);
    walletVerificationStatus.value = "failed";
  }
}

// ─── Navigation ────────────────────────────────────────────────────────────────

function openJomhoorApp() {
  if (deepLink.value) {
    window.open(deepLink.value, "_blank", "noopener, noreferrer");
  }
}

watch(walletVerificationStatus, async () => {
  switch (walletVerificationStatus.value) {
    case "pending":
      break;
    case "verified":
      await completeVerification();
      break;
    case "failed":
      showNotifyMessage(t("verificationFailed"));
      break;
    case "expired":
      // Handled in pollWalletStatus
      break;
  }
});

async function completeVerification() {
  if (pollIntervalId !== undefined) {
    window.clearInterval(pollIntervalId);
  }

  if (accountMerged.value) {
    showNotifyMessage(t("accountMerged"));
  } else {
    showNotifyMessage(t("verificationSuccessful"));
  }

  await updateAuthState({
    partialLoginStatus: { isLoggedIn: true, userId: verifiedUserId.value },
    forceRefresh: true,
  });

  // Notify native app of success (for WebView)
  const jw = window as JomhoorWindow;
  if (isJomhoorWebView.value && jw.ReactNativeWebView) {
    jw.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "WALLET_AUTH_COMPLETE", success: true }),
    );
  }

  if (onboardingMode == "LOGIN") {
    await routeUserAfterLogin();
  } else {
    await router.push({ name: "/onboarding/step4-username/" });
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await initialize();
});

watch(isAuthInitialized, async () => {
  await initialize();
});

async function initialize() {
  if (isAuthInitialized.value) {
    webViewDebugStatus.value = "Auth initialized, requesting challenge...";
    await requestChallenge();
  } else {
    webViewDebugStatus.value = "Waiting for auth to initialize...";
  }
}

onUnmounted(() => {
  if (pollIntervalId !== undefined) {
    clearInterval(pollIntervalId);
  }
});
</script>

<style scoped lang="scss">
.walletHeroContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

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

.qrcodeBlock {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.qrcodeBlock img {
  max-width: 218px;
  height: auto;
}

.verificationProcedureBlock {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  align-items: center;
}

.waitingVerificationText {
  text-align: center;
  font-size: 0.9rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.cardBackground {
  background-color: $app-background-color;
}
</style>
