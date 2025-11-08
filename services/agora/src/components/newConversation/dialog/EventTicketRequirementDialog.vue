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
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import EventTicketSelectionDialog from "./EventTicketSelectionDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  eventTicketRequirementDialogTranslations,
  type EventTicketRequirementDialogTranslations,
} from "./EventTicketRequirementDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const { t } = useComponentI18n<EventTicketRequirementDialogTranslations>(
  eventTicketRequirementDialogTranslations
);

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
    conversationDraft.value.requiresEventTicket = undefined;
    showDialog.value = false;
  } else if (option.value === "requiresEventTicket") {
    // Close this dialog and open event selection dialog
    showDialog.value = false;
    showEventSelectionDialog.value = true;
  }
}

function handleGoBack(): void {
  showEventSelectionDialog.value = false;
  showDialog.value = true;
}
</script>
