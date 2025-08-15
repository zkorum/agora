<template>
  <q-dialog :model-value="true" position="bottom" persistent>
    <ZKBottomDialogContainer>
      <div v-if="step === 'language'">
        <SpokenLanguageStep @next="step = 'topics'" />
      </div>
      <div v-else-if="step === 'topics'">
        <TopicSelectionStep @close="emit('close')" @back="step = 'language'" />
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import SpokenLanguageStep from "src/components/onboarding/steps/SpokenLanguageStep.vue";
import TopicSelectionStep from "src/components/onboarding/steps/TopicSelectionStep.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const step = ref<"language" | "topics">("language");
</script>
