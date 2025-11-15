<template>
  <div>
    <DialogContainer
      v-model="model"
      :title="title"
      :message="description"
      :show-cancel-dialog="true"
      :cancel-callback="noSaveDraft"
      :ok-callback="saveDraft"
      :label-ok="t('saveAsDraft')"
      :label-cancel="t('discard')"
      :ok-loading="false"
    >
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import DialogContainer from "../authentication/intention/DialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exitRoutePromptTranslations,
  type ExitRoutePromptTranslations,
} from "./ExitRoutePrompt.i18n";

const model = defineModel<boolean>({ required: true });

defineProps<{
  title: string;
  description: string;
  saveDraft: () => void;
  noSaveDraft: () => void;
}>();

const { t } = useComponentI18n<ExitRoutePromptTranslations>(
  exitRoutePromptTranslations
);
</script>

<style lang="scss" scoped>
.dialogTitle {
  font-size: 1.4rem;
  font-weight: var(--font-weight-bold);
}
</style>
