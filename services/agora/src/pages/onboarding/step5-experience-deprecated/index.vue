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
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
    <StepperLayout
      :submit-call-back="goToNextRoute"
      :current-step="5"
      :total-steps="6"
      :enable-next-button="true"
      :show-next-button="false"
    >
      <template #header>
        <InfoHeader
          title="Choose how you want to experience Agora"
          :description="description"
          icon-name="mdi-image"
        />
      </template>

      <template #body>
        <div @click="selectedOption('safe-space')">
          <ZKHoverEffect :enable-hover="true">
            <ZKCard padding="1rem">
              <div class="optionWrapper">
                <div class="optionTitle">Safe Space</div>

                <div>
                  Content flagged as antisocial (trolling or intolerance) is
                  removed from my feed. If I want to see what was removed, I can
                  check the post’s moderation history.
                </div>
              </div>
            </ZKCard>
          </ZKHoverEffect>
        </div>

        <div @click="selectedOption('brave-space')">
          <ZKHoverEffect :enable-hover="true">
            <ZKCard padding="1rem">
              <div class="optionWrapper">
                <div class="optionTitle">Brave Space</div>

                <div>
                  Content flagged as antisocial is shown to me with a warning.
                </div>
              </div>
            </ZKCard>
          </ZKHoverEffect>
        </div>
      </template>
    </StepperLayout>
  </MainLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { ref } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import MainLayout from "src/layouts/MainLayout.vue";

const description = ref("");

function goToNextRoute() {
  // router.push({ name: "onboarding-step6-preferences" });
}

function selectedOption(option: "safe-space" | "brave-space") {
  console.log(option);
  goToNextRoute();
}
</script>

<style scoped lang="scss">
.optionTitle {
  font-size: 1.2rem;
  font-weight: bold;
}

.optionWrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
