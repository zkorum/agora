<template>
  <div
    ref="stepper"
    class="stepperLayout"
    :class="{
      'stepperLayout--compact': density === 'compact',
      'stepperLayout--fixedNavigation': fixedNavigation,
    }"
  >
    <div
      :key="currentStep"
      ref="content"
      class="scrollContent"
      :tabindex="fixedNavigation ? 0 : -1"
      role="group"
      :aria-label="progressLabel"
    >
      <OnboardStepper
        v-if="showStepper"
        :current-step="currentStep"
        :total-steps="totalSteps"
        :label="progressLabel"
      />

      <slot name="header"></slot>

      <div class="bodyContent">
        <slot name="body" :navigation-element="nextButton ?? undefined"></slot>
      </div>
    </div>

    <div v-if="showNextButton" ref="nextButton" class="nextButton">
      <ZKButton
        button-type="standardButton"
        :icon="nextIcon"
        :aria-label="t('continue')"
        :color="enableNextButton ? 'primary' : 'button-background-color'"
        :text-color="enableNextButton ? 'white' : 'color-text-strong'"
        :disable="!enableNextButton || showLoadingButton"
        :loading="showLoadingButton"
        @click="submitCallBack"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import OnboardStepper from "src/components/onboarding/layouts/OnboardStepper.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useDefaultActionOnEnter } from "src/composables/ui/useDefaultActionOnEnter";
import { isActiveKeyboardScope } from "src/utils/ui/keyboardScope";
import { computed, useTemplateRef, watch } from "vue";

import {
  type StepperLayoutTranslations,
  stepperLayoutTranslations,
} from "./StepperLayout.i18n";

const props = withDefaults(
  defineProps<{
    submitCallBack: () => void;
    currentStep: number;
    totalSteps: number;
    enableNextButton: boolean;
    showNextButton: boolean;
    showLoadingButton: boolean;
    showStepper?: boolean;
    density?: "comfortable" | "compact";
    fixedNavigation?: boolean;
  }>(),
  {
    showStepper: true,
    density: "comfortable",
    fixedNavigation: false,
  }
);

const $q = useQuasar();
const { t } = useComponentI18n<StepperLayoutTranslations>(
  stepperLayoutTranslations
);
const nextIcon = computed(() =>
  $q.lang.rtl ? "mdi-arrow-left" : "mdi-arrow-right"
);
// OTP screens use half-steps visually but still belong to the same named step.
const progressLabel = computed(() =>
  t("stepProgress", {
    current: Math.floor(props.currentStep),
    total: props.totalSteps,
  })
);
const stepper = useTemplateRef<HTMLElement>("stepper");
const content = useTemplateRef<HTMLElement>("content");
const nextButton = useTemplateRef<HTMLElement>("nextButton");
useDefaultActionOnEnter({
  container: stepper,
  button: () =>
    nextButton.value?.querySelector<HTMLButtonElement>("button") ?? undefined,
  enabled: () =>
    props.showNextButton && props.enableNextButton && !props.showLoadingButton,
});

watch(
  [() => props.currentStep, content],
  ([step, element], [previousStep, previousElement]) => {
    const root = stepper.value;
    if (element === null || root === null || !isActiveKeyboardScope(root))
      return;
    const active = element.ownerDocument.activeElement;
    const changedStep = previousElement !== null && previousStep !== step;
    // Start reading the new step before tabbing into its fields. On first mount,
    // keep any autofocus that an input or a popup already owns.
    if (
      changedStep ||
      active === element.ownerDocument.body ||
      (active instanceof Element && active.contains(element))
    ) {
      element.focus({ preventScroll: true });
    }
  },
  { flush: "post" }
);
</script>

<style scoped lang="scss">
.stepperLayout {
  --stepper-content-gap: 2rem;

  background-color: white;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  gap: var(--stepper-content-gap);
  padding: 1rem;
  padding-bottom: 5rem;
}

.stepperLayout--compact {
  --stepper-content-gap: clamp(0.875rem, 2.5dvh, 1.5rem);

  padding-bottom: 3rem;
}

.scrollContent {
  display: flex;
  flex-direction: column;
  gap: var(--stepper-content-gap);
}

.scrollContent:focus-visible {
  outline: 2px solid $primary;
  outline-offset: -2px;
}

.stepperLayout--fixedNavigation {
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 0;
  padding: 0;

  .scrollContent {
    // Follow short questions naturally; shrink to reserve the action on long ones.
    flex: 0 1 auto;
    min-height: 0;
    padding-block: clamp(1rem, 3dvh, 2rem);
    padding-inline: 1rem;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  .nextButton {
    flex-shrink: 0;
    padding-block: 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    padding-inline: 1rem;
    background-color: white;
  }
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
