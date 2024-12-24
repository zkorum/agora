<template>
  <div>
    <StepperLayout
      :submit-call-back="() => {}"
      :current-step="2"
      :total-steps="5"
      :enable-next-button="true"
      :show-next-button="false"
    >
      <template #header>
        <InfoHeader
          title="Agora aims to be exclusively human"
          :description="description"
          icon-name="mdi-heart"
        />
      </template>

      <template #body>
        <ZKButton
          label="What is RariMe?"
          color="primary"
          @click="goToNextRoute()"
        />

        <ZKButton
          label="Verify with my phone number"
          color="button-background-color"
          text-color="color-text-strong"
          @click="verifyPhone()"
        />
      </template>
    </StepperLayout>
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const description =
  "We ask you to prove your humanity anonymously with RariMe, so Agora is authentically human, free from bots and their propaganda.";

function goToNextRoute() {
  router.push({ name: "onboarding-step3-passport" });
}

function verifyPhone() {
  router.push({ name: "onboarding-step3-phone-1" });
}
</script>

<style scoped lang="scss"></style>
