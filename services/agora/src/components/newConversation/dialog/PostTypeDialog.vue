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

const { setImportMode } = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const postTypeOptions = [
  {
    title: "Regular Post",
    description: "Create a new conversation with a title and body.",
    value: "regular",
  },
  {
    title: "Import from Polis",
    description: "Import an existing conversation from a Polis URL.",
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
  setImportMode(option.value === "import");
}
</script>
