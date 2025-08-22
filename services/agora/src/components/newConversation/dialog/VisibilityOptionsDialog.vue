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
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  visibilityOptionsDialogTranslations,
  type VisibilityOptionsDialogTranslations,
} from "./VisibilityOptionsDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const store = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(store);
const { togglePrivacy } = store;

const { t } = useComponentI18n<VisibilityOptionsDialogTranslations>(
  visibilityOptionsDialogTranslations
);

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
  showDialog.value = false;
  togglePrivacy(option.value === "private");
}
</script>
