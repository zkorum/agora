<template>
  <DrawerLayout :general-props="{
    addGeneralPadding: false,
    addBottomPadding: false,
    enableHeader: true,
    enableFooter: false,
    reducedWidth: true,
  }">
    <StepperLayout :submit-call-back="goToNextRoute" :current-step="5" :total-steps="6" :enable-next-button="true"
      :show-next-button="false" :show-loading-button="false">
      <template #header>
        <InfoHeader :title="t('title')" :description="description" icon-name="mdi-image" />
      </template>

      <template #body>
        <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
        <!-- Experience selection options should be keyboard navigable for users with disabilities -->
        <div @click="selectedOption('safe-space')">
          <ZKHoverEffect :enable-hover="true">
            <ZKCard padding="1rem">
              <div class="optionWrapper">
                <div class="optionTitle">{{ t("safeSpaceTitle") }}</div>

                <div>
                  {{ t("safeSpaceDescription") }}
                </div>
              </div>
            </ZKCard>
          </ZKHoverEffect>
        </div>

        <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
        <!-- Experience selection options should be keyboard navigable for users with disabilities -->
        <div @click="selectedOption('brave-space')">
          <ZKHoverEffect :enable-hover="true">
            <ZKCard padding="1rem">
              <div class="optionWrapper">
                <div class="optionTitle">{{ t("braveSpaceTitle") }}</div>

                <div>
                  {{ t("braveSpaceDescription") }}
                </div>
              </div>
            </ZKCard>
          </ZKHoverEffect>
        </div>
      </template>
    </StepperLayout>
  </DrawerLayout>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import { ref } from "vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  step5ExperienceTranslations,
  type Step5ExperienceTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<Step5ExperienceTranslations>(
  step5ExperienceTranslations
);

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
