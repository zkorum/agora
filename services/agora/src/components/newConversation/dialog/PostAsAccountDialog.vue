<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer> asdf </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
</script>

<style scoped lang="scss"></style>
