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
      :current-step="1"
      :total-steps="5"
      :enable-next-button="true"
      :show-next-button="false"
    >
      <template #header>
        <InfoHeader
          title="Log In"
          :description="description"
          icon-name="mdi-login"
        />
      </template>

      <template #body>
        <ZKButton
          label="Log In with RariMe"
          color="primary"
          @click="goToPassportLogin()"
        />

        <ZKButton
          label="Login with my phone number"
          color="secondary"
          text-color="primary"
          @click="goToPhoneLogin()"
        />
      </template>
    </StepperLayout>
  </MainLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import MainLayout from "src/layouts/MainLayout.vue";

const description = "Please select a log in method.";

const router = useRouter();

async function goToPassportLogin() {
  await router.push({ name: "/onboarding/step3-passport/" });
}

async function goToPhoneLogin() {
  await router.push({ name: "/onboarding/step3-phone-1/" });
}
</script>

<style scoped lang="scss"></style>
