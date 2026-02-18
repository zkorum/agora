<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="visibilityOptions"
        :selected-value="isPrivate ? 'private' : 'public'"
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

import {
  type VisibilityOptionsDialogTranslations,
  visibilityOptionsDialogTranslations,
} from "./VisibilityOptionsDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });
const isPrivate = defineModel<boolean>("isPrivate", { required: true });
const requiresLogin = defineModel<boolean>("requiresLogin", { required: true });
const requiresEventTicket = defineModel<EventSlug | undefined>(
  "requiresEventTicket",
  { required: true }
);

const { t } = useComponentI18n<VisibilityOptionsDialogTranslations>(
  visibilityOptionsDialogTranslations
);

const { showNotifyMessage } = useNotify();

const visibilityOptions = [
  {
    title: t("publicTitle"),
    description: t("publicDescription"),
    value: "public",
  },
  {
    title: t("privateTitle"),
    description: t("privateDescription"),
    value: "private",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  const isPublic = option.value === "public";
  const hasGuestParticipation = !requiresLogin.value;
  const hasTicketVerification = requiresEventTicket.value !== undefined;

  // Cross-cutting validation: public + guest participation requires event ticket
  if (isPublic && hasGuestParticipation && !hasTicketVerification) {
    requiresLogin.value = true;
    showNotifyMessage(t("guestParticipationDisabledForPublic"));
  }

  isPrivate.value = option.value === "private";
  showDialog.value = false;
}
</script>
