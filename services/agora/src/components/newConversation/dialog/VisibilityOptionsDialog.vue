<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="visibility-options">
        <div
          class="visibility-option"
          :class="{ selected: isPrivatePost === true }"
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
          :class="{ selected: isPrivatePost === false }"
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
import { computed } from "vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

interface Props {
  modelValue: boolean;
  isPrivatePost: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "update:isPrivatePost", value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

function updatePrivatePost(value: boolean) {
  emit("update:isPrivatePost", value);
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
  background-color: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.8);
}

.option-header {
  font-weight: 600;
}

.option-description {
  color: $color-text-weak;
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
