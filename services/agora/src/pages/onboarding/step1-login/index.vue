<template>
  <div>
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
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";

const description = "Please select a log in method.";

const router = useRouter();

function goToPassportLogin() {
  router.push({ name: "onboarding-step3-passport" });
}

function goToPhoneLogin() {
  router.push({ name: "onboarding-step3-phone-1" });
}
</script>

<style scoped lang="scss"></style>
