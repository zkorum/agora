<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="action-dialog">
        <div v-if="title || message" class="dialog-header">
          <h3 v-if="title" class="dialog-title">{{ title }}</h3>
          <p v-if="message" class="dialog-message">{{ message }}</p>
        </div>

        <div class="action-list">
          <template v-for="(action, index) in actions" :key="action.id">
            <!-- Separator before destructive actions -->
            <div
              v-if="action.variant === 'destructive' && index > 0"
              class="action-separator"
            />
            <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
            <!-- Action dialog items should be keyboard navigable for users with motor disabilities -->
            <div
              class="action-item"
              :class="getActionVariantClass(action)"
              @click="handleActionClick(action)"
            >
              <q-icon :name="action.icon" size="20px" class="action-icon" />
              <div class="action-content">
                <div class="action-label">{{ action.label }}</div>
                <div v-if="action.description" class="action-description">
                  {{ action.description }}
                </div>
              </div>
            </div>
          </template>
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

const showDialog = defineModel<boolean>({ required: true });

/**
 * Get CSS class for action variant
 */
const getActionVariantClass = (action: ContentAction): string => {
  if (action.variant === "destructive") {
    return "action-destructive";
  }
  if (action.variant === "warning") {
    return "action-warning";
  }
  return "";
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
  gap: 1rem;
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
}

.action-separator {
  height: 1px;
  background-color: $color-border-weak;
  margin: 0.25rem 0;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  @include hover-effects($hover-background-color);
}

.action-icon {
  flex-shrink: 0;
  color: $color-text-weak;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-label {
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-strong;
}

.action-description {
  font-size: 0.8rem;
  color: $color-text-weak;
  line-height: 1.4;
}

.action-destructive {
  .action-icon {
    color: $negative;
  }

  .action-label {
    color: $negative;
  }
}
</style>
