<template>
  <OnboardingLayout>
    <template #body><ClusterImageExample /> </template>

    <template #footer>
      <StepperLayout
        :submit-call-back="goToNextRoute"
        :current-step="1"
        :total-steps="5"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="false"
      >
        <template #header>
          <InfoHeader
            title="Why does Agora exist?"
            :description="description"
            icon-name="mdi-robot"
          />
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import { useRouter } from "vue-router";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import ClusterImageExample from "src/components/onboarding/backgrounds/ClusterImageExample.vue";

const description =
  "In a world marked by increasing polarizations, Agora strives to rehumanize and depolarize citizen dialogues on key societal issues.";

const router = useRouter();

async function goToNextRoute() {
  await router.push({ name: "/onboarding/step2-signup/" });
}
</script>

<style scoped lang="scss"></style>
