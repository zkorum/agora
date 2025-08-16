<template>
  <q-dialog
    :model-value="showPreferencesDialog"
    position="bottom"
    @update:model-value="handleDialogClose"
  >
    <ZKBottomDialogContainer>
      <div v-if="step === 'language'">
        <SpokenLanguageStep @next="step = 'topics'" />
      </div>
      <div v-else-if="step === 'topics'">
        <TopicSelectionStep
          @close="closePreferencesDialog"
          @back="step = 'language'"
        />
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import SpokenLanguageStep from "src/components/onboarding/steps/SpokenLanguageStep.vue";
import TopicSelectionStep from "src/components/onboarding/steps/TopicSelectionStep.vue";
import { useOnboardingPreferencesStore } from "src/stores/onboarding/preferences";

const { showPreferencesDialog } = storeToRefs(useOnboardingPreferencesStore());
const { closePreferencesDialog } = useOnboardingPreferencesStore();

const step = ref<"language" | "topics">("language");

const handleDialogClose = (value: boolean): void => {
  if (!value) {
    closePreferencesDialog();
  }
};
</script>
