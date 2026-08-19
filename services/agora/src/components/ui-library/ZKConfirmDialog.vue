<template>
  <q-dialog v-model="showDialog" position="bottom" :persistent="persistent">
    <ZKBottomDialogContainer>
      <div class="confirm-dialog">
        <div class="dialog-header">
          <h3 v-if="title" class="dialog-title">{{ title }}</h3>
          <div v-if="$slots.default" class="dialog-message">
            <slot />
          </div>
          <p v-else-if="message" class="dialog-message">{{ message }}</p>
        </div>

        <div
          class="dialog-actions"
          :class="{ 'dialog-actions--three': alternateText !== undefined }"
        >
          <PrimeButton
            v-if="alternateText !== undefined"
            :label="alternateText"
            :severity="alternateSeverity"
            outlined
            class="alternate-button"
            @click="handleAlternate"
          />
          <PrimeButton
            :label="cancelText"
            :severity="cancelSeverity"
            :outlined="cancelOutlined"
            class="cancel-button"
            @click="handleCancel"
          />
          <PrimeButton
            :label="confirmText"
            :severity="confirmSeverity"
            class="confirm-button"
            :class="{ 'confirm-button--warning': variant === 'warning' }"
            @click="handleConfirm"
          />
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { computed, watch } from "vue";

import ZKBottomDialogContainer from "./ZKBottomDialogContainer.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  message: undefined,
  confirmText: "Confirm",
  cancelText: "Cancel",
  cancelSeverity: "secondary",
  cancelOutlined: true,
  alternateText: undefined,
  alternateSeverity: "primary",
  persistent: false,
  variant: "default",
});

const emit = defineEmits<Emits>();

interface Props {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  cancelSeverity?: "primary" | "secondary";
  cancelOutlined?: boolean;
  alternateText?: string;
  alternateSeverity?: "primary" | "secondary";
  persistent?: boolean;
  variant?: "default" | "destructive" | "warning";
}

interface Emits {
  (e: "confirm"): void;
  (e: "cancel"): void;
  (e: "alternate"): void;
  (e: "dialogClosed"): void;
}

const showDialog = defineModel<boolean>({ required: true });
const confirmSeverityByVariant = {
  default: "primary",
  destructive: "danger",
  warning: "warn",
} satisfies Record<
  NonNullable<Props["variant"]>,
  "primary" | "danger" | "warn"
>;
const confirmSeverity = computed(() => confirmSeverityByVariant[props.variant]);

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

function handleAlternate(): void {
  emit("alternate");
  showDialog.value = false;
}

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
    font-weight: var(--font-weight-normal);
    color: black;
    line-height: 1.5;
    text-align: start;
  }
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: stretch;

  .cancel-button,
  .alternate-button,
  .confirm-button {
    flex: 1;
  }

  .confirm-button--warning.p-button.p-button-warn {
    color: white;
    background-color: $warning;
    border-color: $warning;

    &:not(:disabled):hover {
      color: white;
      background-color: $warning;
      border-color: $warning;
      filter: brightness(0.96);
    }
  }

  &.dialog-actions--three {
    flex-direction: column;
  }
}
</style>
