<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="action-dialog">
        <div v-if="title || message" class="dialog-header">
          <h3 v-if="title" class="dialog-title">{{ title }}</h3>
          <p v-if="message" class="dialog-message">{{ message }}</p>
        </div>

        <div class="action-list">
          <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
          <!-- Action dialog items should be keyboard navigable for users with motor disabilities -->
          <div
            v-for="action in actions"
            :key="action.id"
            class="action-item"
            :class="getActionVariantClass(action)"
            @click="handleActionClick(action)"
          >
            <div class="action-icon">
              <q-icon :name="action.icon" size="24px" />
            </div>
            <div class="action-content">
              <div class="action-label">{{ action.label }}</div>
              <div v-if="action.description" class="action-description">
                {{ action.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import type { ContentAction } from "src/utils/actions/core/types";
import { watch } from "vue";

import ZKBottomDialogContainer from "./ZKBottomDialogContainer.vue";

interface Props {
  actions: ContentAction[];
  title?: string;
  message?: string;
}

interface Emits {
  (e: "actionSelected", action: ContentAction): void;
  (e: "dialogClosed"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = defineModel<boolean>();

/**
 * Get CSS class for action variant
 */
const getActionVariantClass = (action: ContentAction): string => {
  const baseClass = "action-item";
  if (action.variant === "destructive") {
    return `${baseClass} action-destructive`;
  }
  if (action.variant === "warning") {
    return `${baseClass} action-warning`;
  }
  return baseClass;
};

/**
 * Handle action click
 */
const handleActionClick = (action: ContentAction): void => {
  emit("actionSelected", action);
  showDialog.value = false;
};

/**
 * Watch for dialog close
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
.action-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: $primary;
}

.dialog-header {
  text-align: center;

  .dialog-title {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: var(--font-weight-semibold);
    color: $color-text-strong;
  }

  .dialog-message {
    margin: 0;
    font-size: 0.9rem;
    color: $color-text-weak;
  }
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  @include hover-effects($hover-background-color);
}

.action-warning {
  .action-icon {
    color: $warning;
  }
}

.action-destructive {
  .action-icon {
    color: $negative;
  }
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-label {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-strong;
  margin-bottom: 0.25rem;
}

.action-description {
  font-size: 0.8rem;
  color: $color-text-weak;
  line-height: 1.4;
}
</style>
