<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="postTypeOptions"
        :selected-value="
          conversationDraft.importSettings.isImportMode ? 'import' : 'regular'
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

const showDialog = defineModel<boolean>();

const emit = defineEmits<{
  modeChangeRequested: [isImport: boolean];
}>();

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const postTypeOptions = [
  {
    title: "New Conversation",
    description: "Create a new conversation topic for discussion.",
    value: "regular",
  },
  {
    title: "Import from Polis",
    description: "Import and continue an existing Polis conversation.",
    value: "import",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}) {
  if (showDialog.value) {
    showDialog.value = false;
  }

  const isImport = option.value === "import";
  emit("modeChangeRequested", isImport);
}
</script>
