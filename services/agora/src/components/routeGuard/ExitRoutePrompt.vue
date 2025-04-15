<template>
  <div>
    <DialogContainer
      v-model="model"
      :title="title"
      :message="description"
      :show-cancel-dialog="true"
      :cancel-callback="noSaveDraft"
      :ok-callback="saveDraft"
      :label-ok="'Save as draft'"
      :label-cancel="'Discard'"
    >
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import DialogContainer from "../authentication/intention/DialogContainer.vue";

const model = defineModel<boolean>({ required: true });

defineProps<{
  title: string;
  description: string;
  saveDraft: () => void;
  noSaveDraft: () => void;
}>();
</script>

<style lang="scss" scoped>
.dialogTitle {
  font-size: 1.4rem;
  font-weight: bold;
}
</style>
