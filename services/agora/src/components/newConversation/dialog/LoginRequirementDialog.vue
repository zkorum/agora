<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="loginRequirementOptions"
        :selected-value="requiresLogin ? 'requiresLogin' : 'guestParticipation'"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { EventSlug } from "src/shared/types/zod";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";

import {
  type LoginRequirementDialogTranslations,
  loginRequirementDialogTranslations,
} from "./LoginRequirementDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });
const requiresLogin = defineModel<boolean>("requiresLogin", { required: true });
const isPrivate = defineModel<boolean>("isPrivate", { required: true });
const requiresEventTicket = defineModel<EventSlug | undefined>(
  "requiresEventTicket",
  { required: true }
);

const { t } = useComponentI18n<LoginRequirementDialogTranslations>(
  loginRequirementDialogTranslations
);

const { showNotifyMessage } = useNotify();

const loginRequirementOptions = computed(() => [
  {
    title: t("requiresLoginTitle"),
    description: t("requiresLoginDescription"),
    value: "requiresLogin",
  },
  {
    title: t("guestParticipationTitle"),
    description: t("guestParticipationDescription"),
    value: "guestParticipation",
  },
]);

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  const isSelectingGuest = option.value === "guestParticipation";
  const isPublic = !isPrivate.value;
  const hasTicketVerification = requiresEventTicket.value !== undefined;

  // Cross-cutting validation: guest + public requires event ticket
  if (isSelectingGuest && isPublic && !hasTicketVerification) {
    isPrivate.value = true;
    showNotifyMessage(t("conversationSwitchedToPrivate"));
  }

  requiresLogin.value = option.value === "requiresLogin";
  showDialog.value = false;
}
</script>
