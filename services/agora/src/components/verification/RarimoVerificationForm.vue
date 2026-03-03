<template>
  <div>
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
            <span>
              <a
                class="hrefColor"
                :href="rarimoStoreLink"
                target="_blank"
                rel="noopener noreferrer"
                >Rarimo</a
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
            <div
              v-if="verificationLink.length != 0"
              class="mobileUrlContainer"
            >
              <div class="mobileUrl">{{ verificationLink }}</div>
              <ZKButton
                button-type="standardButton"
                :label="t('copy')"
                icon="mdi-content-copy"
                size="0.9rem"
                @click="copyVerificationLink()"
              />
            </div>
            <div class="waitingVerificationText">
              {{ t("waitingForVerification") }}
            </div>
          </div>
        </div>
      </div>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import { useQRCode } from "@vueuse/integrations/useQRCode";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { copyToClipboard } from "quasar";
import { DefaultApiAxiosParamCreator, DefaultApiFactory } from "src/api/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import { Dto } from "src/shared/types/dto";
import type { LinkType, RarimoStatusAttributes } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { api } from "src/utils/api/client";
import { type KeyAction, useCommonApi } from "src/utils/api/common";
import { buildAuthorizationHeader } from "src/utils/crypto/ucan/operation";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref, watch } from "vue";
import { onUnmounted } from "vue";

import ZKButton from "../ui-library/ZKButton.vue";
import ZKCard from "../ui-library/ZKCard.vue";
import {
  type RarimoVerificationFormTranslations,
  rarimoVerificationFormTranslations,
} from "./RarimoVerificationForm.i18n";

const emit = defineEmits<{
  verified: [accountMerged: boolean];
}>();

const { t } = useComponentI18n<RarimoVerificationFormTranslations>(
  rarimoVerificationFormTranslations
);

const quasar = useQuasar();

const { buildEncodedUcan } = useCommonApi();
const { showNotifyMessage } = useNotify();

let isDeviceLoggedInIntervalId: number | undefined = undefined;
let isUnmounted = false;
const verificationLink = ref<string>("");

const qrcode = useQRCode(verificationLink, {
  width: 218,
  margin: 1,
  color: {
    dark: "#000000",
    light: "#0000",
  },
});
const qrcodeVerificationStatus = ref<RarimoStatusAttributes>("not_verified");
const accountMerged = ref(false);
const verifiedUserId = ref<string>("");

const { completeVerification } = useVerificationComplete();

const rarimoStoreLink = ref("");

const verificationLinkGenerationFailed = ref(false);

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

if (quasar.platform.is.android) {
  rarimoStoreLink.value =
    "https://play.google.com/store/apps/details?id=com.rarilabs.rarime";
} else if (quasar.platform.is.ios) {
  rarimoStoreLink.value = "https://apps.apple.com/us/app/rarime/id6503300598";
} else {
  rarimoStoreLink.value = "https://rarimo.com/";
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
    if (isUnmounted) return;
    const data = Dto.generateVerificationLink200.parse(response.data);
    if (data.success) {
      verificationLink.value = data.verificationLink;
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
      switch (data.reason) {
        case "already_has_credential":
          qrcodeVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          await generateVerificationLink("overwrite");
          break;
      }
    }
  } catch (e) {
    if (isUnmounted) return;
    console.error("Error while fetching Rarimo verification link", e);
    showNotifyMessage(t("unexpectedError"));
    verificationLinkGenerationFailed.value = true;
  }
}

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
  if (isUnmounted) return;
  switch (qrcodeVerificationStatus.value) {
    case "not_verified":
      break;
    case "verified":
      await onVerified();
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
  isUnmounted = true;
  if (isDeviceLoggedInIntervalId !== undefined) {
    clearInterval(isDeviceLoggedInIntervalId);
  }
});

async function copyVerificationLink() {
  try {
    await copyToClipboard(verificationLink.value);
    showNotifyMessage(t("copiedToClipboard"));
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    showNotifyMessage(t("couldNotCopy"));
  }
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

    if (isUnmounted) return;
    const data = Dto.verifyUserStatusAndAuthenticate200.parse(response.data);

    if (data.success) {
      switch (data.rarimoStatus) {
        case "not_verified":
          qrcodeVerificationStatus.value = "not_verified";
          break;
        case "failed_verification":
          qrcodeVerificationStatus.value = "failed_verification";
          break;
        case "uniqueness_check_failed":
          qrcodeVerificationStatus.value = "uniqueness_check_failed";
          break;
        case "verified":
          qrcodeVerificationStatus.value = "verified";
          accountMerged.value = data.accountMerged;
          verifiedUserId.value = data.userId;
          break;
      }
    } else {
      switch (data.reason) {
        case "already_has_credential":
          qrcodeVerificationStatus.value = "verified";
          break;
        case "associated_with_another_user":
          window.clearInterval(isDeviceLoggedInIntervalId);
          showNotifyMessage(t("syncHiccup"));
          await generateVerificationLink("overwrite");
          break;
      }
    }
  } catch (e) {
    if (isUnmounted) return;
    console.error("Error while verifying proof", e);
    qrcodeVerificationStatus.value = "failed_verification";
  }
}

function clickedVerifyButton() {
  window.open(verificationLink.value, "_blank", "noopener, noreferrer");
}

async function onVerified() {
  window.clearInterval(isDeviceLoggedInIntervalId);
  if (accountMerged.value) {
    showNotifyMessage(t("accountMerged"));
  } else {
    showNotifyMessage(t("verificationSuccessful"));
  }
  emit("verified", accountMerged.value);
  await completeVerification();
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

.mobileUrlContainer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}

.mobileUrl {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.7rem;
  font-family: monospace;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
}

.verificationProcedureBlock {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  align-items: center;
}

.verificationProcedureBlock img {
  max-width: 218px;
  height: auto;
}

.waitingVerificationText {
  text-align: center;
  font-size: 0.9rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
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
