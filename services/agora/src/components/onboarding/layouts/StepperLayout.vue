<template>
  <div>
    <div class="container">
      <OnboardStepper v-if="showStepper" :current-step="currentStep" :total-steps="totalSteps" />

      <slot name="header"></slot>

      <div class="bodyContent">
        <slot name="body"></slot>
      </div>

      <div v-if="showNextButton" class="nextButton">
        <ZKButton
          button-type="standardButton"
          icon="mdi-arrow-right"
          :color="enableNextButton ? 'primary' : 'button-background-color'"
          :text-color="enableNextButton ? 'white' : 'color-text-strong'"
          :disable="!enableNextButton || showLoadingButton"
          :loading="showLoadingButton"
          @click="submitCallBack"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OnboardStepper from "src/components/onboarding/layouts/OnboardStepper.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";

withDefaults(
  defineProps<{
    submitCallBack: () => void;
    currentStep: number;
    totalSteps: number;
    enableNextButton: boolean;
    showNextButton: boolean;
    showLoadingButton: boolean;
    showStepper?: boolean;
  }>(),
  {
    showStepper: true,
  }
);
</script>

<style scoped lang="scss">
.container {
  background-color: white;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem;
  padding-bottom: 5rem;
}

.bodyContent {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.nextButton {
  display: flex;
  justify-content: flex-end;
}
</style>
