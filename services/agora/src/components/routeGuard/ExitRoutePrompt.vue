<template>
  <div>
    <DialogContainer
      v-model="model"
      :title="title"
      :message="description"
      :show-cancel-dialog="true"
      :ok-callback="leaveRoute"
    >
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import DialogContainer from "../authentication/DialogContainer.vue";

const model = defineModel<boolean>({ required: true });

const emit = defineEmits(["leaveFoute"]);

defineProps<{
  title: string;
  description: string;
}>();

function leaveRoute() {
  emit("leaveFoute");
}
</script>

<style lang="scss" scoped>
.dialogTitle {
  font-size: 1.4rem;
  font-weight: bold;
}
</style>
