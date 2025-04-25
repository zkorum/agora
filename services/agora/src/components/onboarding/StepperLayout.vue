<template>
  <div>
    <div class="container">
      <OnboardStepper :current-step="currentStep" :total-steps="totalSteps" />

      <slot name="header"></slot>

      <slot name="body"></slot>

      <div v-if="showNextButton" class="nextButton">
        <ZKButton
          button-type="standardButton"
          icon="mdi-arrow-right"
          :color="enableNextButton ? 'primary' : 'button-background-color'"
          :text-color="enableNextButton ? 'white' : 'color-text-strong'"
          :disable="!enableNextButton || showLoadingButton"
          :loading="showLoadingButton"
          type="submit"
          @click="submitCallBack"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OnboardStepper from "src/components/onboarding/OnboardStepper.vue";
import ZKButton from "../ui-library/ZKButton.vue";

defineProps<{
  submitCallBack: () => void;
  currentStep: number;
  totalSteps: number;
  enableNextButton: boolean;
  showNextButton: boolean;
  showLoadingButton: boolean;
}>();
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

.nextButton {
  display: flex;
  justify-content: right;
}
</style>
