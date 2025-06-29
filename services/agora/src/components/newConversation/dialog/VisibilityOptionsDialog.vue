<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="visibilityOptions"
        :selected-value="postDraft.isPrivatePost ? 'private' : 'public'"
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

const { postDraft } = storeToRefs(useNewPostDraftsStore());

const visibilityOptions = [
  {
    title: "Public",
    description:
      "This conversation will be visible to all users in the main Agora feed",
    value: "public",
  },
  {
    title: "Private",
    description: "Only visible to those with whom you share a link or QR code",
    value: "private",
  },
];

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}) {
  showDialog.value = false;
  postDraft.value.isPrivatePost = option.value === "private";
}
</script>
