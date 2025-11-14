<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="loginRequirementOptions"
        :selected-value="
          conversationDraft.requiresLogin ? 'requiresLogin' : 'guestParticipation'
        "
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNotify } from "src/utils/ui/notify";
import {
  loginRequirementDialogTranslations,
  type LoginRequirementDialogTranslations,
} from "./LoginRequirementDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

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
}) {
  const isSelectingGuest = option.value === "guestParticipation";
  const isPublic = !conversationDraft.value.isPrivate;
  const hasTicketVerification =
    conversationDraft.value.requiresEventTicket !== undefined;

  if (isSelectingGuest && isPublic && !hasTicketVerification) {
    conversationDraft.value.isPrivate = true;
    showNotifyMessage(t("conversationSwitchedToPrivate"));
  }

  showDialog.value = false;
  conversationDraft.value.requiresLogin = option.value === "requiresLogin";
}
</script>
