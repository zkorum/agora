<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="confirm-dialog">
        <div class="dialog-header">
          <h3 v-if="title" class="dialog-title">{{ title }}</h3>
          <p v-if="message || $slots.default" class="dialog-message">
            <slot>{{ message }}</slot>
          </p>
        </div>

        <div class="dialog-actions">
          <PrimeButton
            :label="cancelText"
            severity="secondary"
            outlined
            class="cancel-button"
            @click="handleCancel"
          />
          <PrimeButton
            :label="confirmText"
            :severity="variant === 'destructive' ? 'danger' : 'primary'"
            class="confirm-button"
            @click="handleConfirm"
          />
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { watch } from "vue";

import ZKBottomDialogContainer from "./ZKBottomDialogContainer.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

withDefaults(defineProps<Props>(), {
  title: undefined,
  message: undefined,
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "default",
});

const emit = defineEmits<Emits>();

interface Props {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface Emits {
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "dialogClosed"): void;
}

const showDialog = defineModel<boolean>({ required: true });

/**
 * Handle confirm button click
 */
const handleConfirm = (): void => {
  emit("confirm");
  showDialog.value = false;
};

/**
 * Handle cancel button click
 */
const handleCancel = (): void => {
  emit("cancel");
  showDialog.value = false;
};

/**
 * Handle dialog close
 */
const handleDialogClose = (): void => {
  emit("dialogClosed");
};

// Watch dialog state changes
watch(showDialog, (newValue) => {
  if (!newValue) {
    handleDialogClose();
  }
});
</script>

<style scoped lang="scss">
.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  color: $primary;
}

.dialog-header {
  .dialog-title {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: var(--font-weight-semibold);
    color: $color-text-strong;
    text-align: center;
  }

  .dialog-message {
    margin: 0;
    font-size: 1rem;
    color: black;
    line-height: 1.5;
    text-align: left;
  }
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: stretch;

  .cancel-button,
  .confirm-button {
    flex: 1;
  }
}
</style>
