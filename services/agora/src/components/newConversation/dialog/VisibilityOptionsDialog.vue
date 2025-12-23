<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="visibilityOptions"
        :selected-value="conversationDraft.isPrivate ? 'private' : 'public'"
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useNotify } from "src/utils/ui/notify";

import {
  type VisibilityOptionsDialogTranslations,
  visibilityOptionsDialogTranslations,
} from "./VisibilityOptionsDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const store = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(store);
const { togglePrivacy } = store;

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
}) {
  const isPublic = option.value === "public";
  const hasGuestParticipation = !conversationDraft.value.requiresLogin;
  const hasTicketVerification =
    conversationDraft.value.requiresEventTicket !== undefined;

  if (isPublic && hasGuestParticipation && !hasTicketVerification) {
    conversationDraft.value.requiresLogin = true;
    showNotifyMessage(t("guestParticipationDisabledForPublic"));
  }

  showDialog.value = false;
  togglePrivacy(option.value === "private");
}
</script>
