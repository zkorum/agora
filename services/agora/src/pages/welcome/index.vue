<template>
  <div class="container">
    <img src="/feed/images/onboarding/brand.webp" class="welcomeImage" />
    <div class="buttonFlex">
      <ZKButton label="Sign Up" color="primary" @click="gotoNextRoute(false)" />

      <ZKButton
        label="Log In"
        color="white"
        text-color="primary"
        @click="gotoNextRoute(true)"
      />

      <ZKButton
        text-color="black"
        color="secondary"
        label="Skip Authentication"
        @click="skipAuthentication()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useRouter } from "vue-router";

const router = useRouter();

const { onboardingMode } = storeToRefs(onboardingFlowStore());

function skipAuthentication() {
  router.push({ name: "default-home-feed" });
}

function gotoNextRoute(isLogin: boolean) {
  if (isLogin) {
    onboardingMode.value = "LOGIN";
    router.push({ name: "onboarding-step1-login" });
  } else {
    onboardingMode.value = "SIGNUP";
    router.push({ name: "onboarding-step1-signup" });
  }
}
</script>

<style scoped>
.buttonFlex {
  display: flex;
  flex-direction: column;
  gap: 2rem;
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
  height: 100vh;
  background-image: url("/feed/images/onboarding/background.webp");
  background-size: cover;
}
</style>
