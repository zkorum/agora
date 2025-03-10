<template>
  <OnboardingLayout>
    <template #body><ClusterImageExample /> </template>

    <template #footer>
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
            :use-extra-padding="true"
            label="Verify anonymously"
            color="primary"
            @click="goToNextRoute()"
          />

          <ZKButton
            :use-extra-padding="true"
            label="Verify with my phone number"
            color="button-background-color"
            text-color="primary"
            @click="verifyPhone()"
          />

          <p>
            <SignupAgreement />
          </p>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useRouter } from "vue-router";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import ClusterImageExample from "src/components/onboarding/backgrounds/ClusterImageExample.vue";
import SignupAgreement from "src/components/onboarding/SignupAgreement.vue";

const router = useRouter();

const description =
  "More than half of internet traffic comes from bots. That’s why we verify users, so you’re debating people, not robots plotting world domination!";

async function goToNextRoute() {
  await router.push({ name: "/onboarding/step3-passport/" });
}

async function verifyPhone() {
  await router.push({ name: "/onboarding/step3-phone-1/" });
}
</script>

<style scoped lang="scss"></style>
