<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="visibility-options">
        <div
          class="visibility-option"
          :class="{ selected: postDraft.isPrivatePost === true }"
          @click="updatePrivatePost(true)"
        >
          <div class="option-header">Requires login</div>
          <div class="option-description">
            Anyone with the link can view the conversation, but will need to
            login to vote and contribute opinions
          </div>
        </div>

        <div
          class="visibility-option"
          :class="{ selected: postDraft.isPrivatePost === false }"
          @click="updatePrivatePost(false)"
        >
          <div class="option-header">Guest participation</div>
          <div class="option-description">
            Anyone with the link can view the conversation, vote and contribute
            opinions
          </div>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { postDraft } = storeToRefs(useNewPostDraftsStore());

function updatePrivatePost(isPrivatePost: boolean) {
  showDialog.value = false;
  postDraft.value.isPrivatePost = isPrivatePost;
}
</script>

<style scoped lang="scss">
.visibility-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.visibility-option {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.visibility-option:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.visibility-option.selected {
  background-color: rgba(25, 118, 210, 0.12);

  &:hover {
    background-color: rgba(25, 118, 210, 0.16);
  }
}

.option-header {
  font-size: 1.1rem;
  font-weight: 600;
}

.option-description {
  color: $color-text-weak;
  font-size: 1rem;
  line-height: 1.4;
}
</style>
