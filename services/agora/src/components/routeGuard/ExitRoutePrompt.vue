<template>
  <div>
    <DialogContainer
      v-model="model"
      :title="title"
      :message="description"
      :show-cancel-dialog="true"
      :cancel-callback="noSaveDraft"
      :ok-callback="leaveRoute"
      :label-ok="'Save as draft'"
      :label-cancel="'Discard'"
    >
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import DialogContainer from "../authentication/intention/DialogContainer.vue";

const model = defineModel<boolean>({ required: true });

const emit = defineEmits(["saveDraft", "noSaveDraft"]);

defineProps<{
  title: string;
  description: string;
}>();

function noSaveDraft() {
  emit("noSaveDraft");
}

function leaveRoute() {
  emit("saveDraft");
}
</script>

<style lang="scss" scoped>
.dialogTitle {
  font-size: 1.4rem;
  font-weight: bold;
}
</style>
