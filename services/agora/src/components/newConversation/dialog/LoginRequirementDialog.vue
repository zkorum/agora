<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="loginRequirementOptions"
        :selected-value="participationMode"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ParticipationMode } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type LoginRequirementDialogTranslations,
  loginRequirementDialogTranslations,
} from "./LoginRequirementDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });
const participationMode = defineModel<ParticipationMode>("participationMode", {
  required: true,
});

const { t } = useComponentI18n<LoginRequirementDialogTranslations>(
  loginRequirementDialogTranslations
);

const loginRequirementOptions = computed(() => [
  {
    title: t("requiresLoginTitle"),
    description: t("requiresLoginDescription"),
    value: "strong_verification" satisfies ParticipationMode,
  },
  {
    title: t("requiresEmailVerificationTitle"),
    description: t("requiresEmailVerificationDescription"),
    value: "email_verification" satisfies ParticipationMode,
  },
  {
    title: t("guestParticipationTitle"),
    description: t("guestParticipationDescription"),
    value: "guest" satisfies ParticipationMode,
  },
]);

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  participationMode.value = option.value as ParticipationMode;
  showDialog.value = false;
}
</script>
