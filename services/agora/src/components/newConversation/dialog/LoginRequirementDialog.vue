<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="loginRequirementOptions"
        :selected-value="
          conversationDraft.privateConversationSettings.requiresLogin
            ? 'requiresLogin'
            : 'guestParticipation'
        "
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const loginRequirementOptions = [
  {
    title: "Guest participation",
    description:
      "Anyone with the link can view the conversation, vote and contribute opinions",
    value: "guestParticipation",
  },
  {
    title: "Requires login",
    description:
      "Anyone with the link can view the conversation, but will need to login to vote and contribute opinions",
    value: "requiresLogin",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}) {
  showDialog.value = false;
  conversationDraft.value.privateConversationSettings.requiresLogin =
    option.value === "requiresLogin";
}
</script>
