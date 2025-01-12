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
  </MainLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { useRouter } from "vue-router";
import MainLayout from "src/layouts/MainLayout.vue";

const description =
  "In a world marked by increasing polarizations, Agora strives to rehumanize and depolarize citizen dialogues on key societal issues.";

const router = useRouter();

async function goToNextRoute() {
  await router.push({ name: "/onboarding/step2-signup/" });
}
</script>

<style scoped lang="scss"></style>
