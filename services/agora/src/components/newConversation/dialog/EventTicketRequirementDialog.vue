<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="eventTicketRequirementOptions"
        :selected-value="
          conversationDraft.requiresEventTicket !== undefined
            ? 'requiresEventTicket'
            : 'noVerification'
        "
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>

  <EventTicketSelectionDialog
    v-model:show-dialog="showEventSelectionDialog"
    @go-back="handleGoBack"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useNotify } from "src/utils/ui/notify";
import { ref } from "vue";

import {
  type EventTicketRequirementDialogTranslations,
  eventTicketRequirementDialogTranslations,
} from "./EventTicketRequirementDialog.i18n";
import EventTicketSelectionDialog from "./EventTicketSelectionDialog.vue";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const { t } = useComponentI18n<EventTicketRequirementDialogTranslations>(
  eventTicketRequirementDialogTranslations
);

const { showNotifyMessage } = useNotify();

const showEventSelectionDialog = ref(false);

const eventTicketRequirementOptions = [
  {
    title: t("noVerificationTitle"),
    description: t("noVerificationDescription"),
    value: "noVerification",
  },
  {
    title: t("requiresEventTicketTitle"),
    description: t("requiresEventTicketDescription"),
    value: "requiresEventTicket",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}) {
  if (option.value === "noVerification") {
    const wasGuestParticipationEnabled = !conversationDraft.value.requiresLogin;
    const isPublic = !conversationDraft.value.isPrivate;

    conversationDraft.value.requiresEventTicket = undefined;

    if (isPublic && wasGuestParticipationEnabled) {
      conversationDraft.value.requiresLogin = true;
      showNotifyMessage(t("guestParticipationDisabledNotification"));
    }

    showDialog.value = false;
  } else if (option.value === "requiresEventTicket") {
    showDialog.value = false;
    showEventSelectionDialog.value = true;
  }
}

function handleGoBack(): void {
  showEventSelectionDialog.value = false;
  showDialog.value = true;
}
</script>
