<template>
  <div
    class="container"
    :style="{ backgroundImage: 'url(/images/onboarding/background.webp)' }"
  >
    <img src="/images/onboarding/brand.webp" class="welcomeImage" />
    <div v-if="!isLoggedIn" class="buttonFlex">
      <SpaLink to="/recover/">{{ tRecovery("title") }}</SpaLink>
      <ZKGradientButton :label="t('signUp')" @click="gotoNextRoute(false)" />

      <ZKGradientButton
        :label="t('login')"
        gradient-background="#ffffff"
        label-color="#6b4eff"
        @click="gotoNextRoute(true)"
      />

      <ZKGradientButton
        :label="t('skipAuthentication')"
        gradient-background="#f1eeff"
        label-color="#000000"
        @click="skipAuthentication()"
      />
    </div>

    <div v-if="isLoggedIn" class="buttonFlex">
      <ZKGradientButton :label="t('launchApp')" @click="skipAuthentication()" />

      <ZKGradientButton
        :label="t('logOut')"
        gradient-background="#80cbc4"
        label-color="#000000"
        @click="logoutRequested(true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { accountRecoveryTranslations } from "src/components/verification/AccountRecovery.i18n";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useAuthSetup } from "src/utils/auth/setup";
import { useRouter } from "vue-router";

import { type WelcomeTranslations, welcomeTranslations } from "./index.i18n";

const { t } = useComponentI18n<WelcomeTranslations>(welcomeTranslations);
const { t: tRecovery } = useComponentI18n(accountRecoveryTranslations);

const router = useRouter();

const { onboardingMode } = storeToRefs(onboardingFlowStore());

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { logoutRequested } = useAuthSetup();

async function skipAuthentication() {
  await router.push({ name: "/" });
}

async function gotoNextRoute(isLogin: boolean) {
  if (isLogin) {
    onboardingMode.value = "LOGIN";
    await router.push({ name: "/onboarding/step1-login/" });
  } else {
    onboardingMode.value = "SIGNUP";
    await router.push({ name: "/onboarding/step1-signup/" });
  }
}
</script>

<style scoped>
.buttonFlex {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: min(15rem, 100%);
}

.welcomeImage {
  width: min(15rem, 100%);
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  height: 100dvh;
  background-size: cover;
}
</style>
