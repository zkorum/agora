<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="eventTicketRequirementOptions"
        :selected-value="
          requiresEventTicket !== undefined
            ? 'requiresEventTicket'
            : 'noVerification'
        "
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>

  <EventTicketSelectionDialog
    v-model:show-dialog="showEventSelectionDialog"
    v-model:requires-event-ticket="requiresEventTicket"
    @go-back="handleGoBack"
  />
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { EventSlug } from "src/shared/types/zod";
import { computed, ref } from "vue";

import {
  type EventTicketRequirementDialogTranslations,
  eventTicketRequirementDialogTranslations,
} from "./EventTicketRequirementDialog.i18n";
import EventTicketSelectionDialog from "./EventTicketSelectionDialog.vue";

interface Props {
  canAddEventTicket?: boolean;
  canChangeEventTicket?: boolean;
  canRemoveEventTicket?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canAddEventTicket: true,
  canChangeEventTicket: true,
  canRemoveEventTicket: true,
});

const showDialog = defineModel<boolean>("showDialog", { required: true });
const requiresEventTicket = defineModel<EventSlug | undefined>(
  "requiresEventTicket",
  { required: true }
);

const { t } = useComponentI18n<EventTicketRequirementDialogTranslations>(
  eventTicketRequirementDialogTranslations
);

const showEventSelectionDialog = ref(false);

const eventTicketRequirementOptions = computed(() => [
  {
    title: t("noVerificationTitle"),
    description: t("noVerificationDescription"),
    value: "noVerification",
    disabled:
      requiresEventTicket.value !== undefined && !props.canRemoveEventTicket,
  },
  {
    title: t("requiresEventTicketTitle"),
    description: t("requiresEventTicketDescription"),
    value: "requiresEventTicket",
    disabled:
      requiresEventTicket.value === undefined
        ? !props.canAddEventTicket
        : !props.canChangeEventTicket,
  },
]);

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  if (option.value === "noVerification") {
    requiresEventTicket.value = undefined;
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
