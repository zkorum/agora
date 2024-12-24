<template>
  <div>
    <StepperLayout
      :submit-call-back="goToNextRoute"
      :current-step="1"
      :total-steps="5"
      :enable-next-button="true"
      :show-next-button="true"
    >
      <template #header>
        <InfoHeader
          title="Why does Agora exist?"
          :description="description"
          icon-name="mdi-robot"
        />
      </template>
    </StepperLayout>
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { useRouter } from "vue-router";

const description =
  "In a world marked by increasing polarizations, Agora strives to rehumanize and depolarize citizen dialogues on key societal issues.";

const router = useRouter();

function goToNextRoute() {
  router.push({ name: "onboarding-step2-signup" });
}
</script>

<style scoped lang="scss"></style>
