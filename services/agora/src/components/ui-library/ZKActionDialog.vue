<template>
  <q-dialog
    v-model="showDialog"
    position="bottom"
    :aria-label="title ?? 'Actions'"
  >
    <ZKBottomDialogContainer>
      <div class="action-dialog">
        <div v-if="title || message" class="dialog-header">
          <h3 v-if="title" class="dialog-title">{{ title }}</h3>
          <p v-if="message" class="dialog-message">{{ message }}</p>
        </div>

        <div class="action-list">
          <template v-for="(action, index) in actions" :key="action.id">
            <div
              v-if="action.variant === 'destructive' && index > 0"
              class="action-separator"
            />
            <div
              v-if="action.trailingControl?.type === 'switch'"
              class="action-item"
              :class="getActionVariantClass(action)"
            >
              <q-icon :name="action.icon" size="20px" class="action-icon" />
              <div class="action-content">
                <div class="action-label">{{ action.label }}</div>
                <div v-if="action.description" class="action-description">
                  {{ action.description }}
                </div>
              </div>
              <ZKSwitch
                :model-value="action.trailingControl.checked"
                :disable="action.disabled === true"
                :aria-label="action.label"
                :track-width="48"
                :track-height="28"
                :thumb-size="24"
                @update:model-value="handleActionClick(action)"
              />
            </div>
            <SpaLink
              v-else-if="action.to !== undefined"
              :to="action.to"
              class="action-item"
              :class="getActionVariantClass(action)"
              @click="handleNavigationClick(action)"
            >
              <q-icon :name="action.icon" size="20px" class="action-icon" />
              <div class="action-content">
                <div class="action-label">{{ action.label }}</div>
                <div v-if="action.description" class="action-description">
                  {{ action.description }}
                </div>
              </div>
              <q-icon
                v-if="action.trailingIcon !== undefined"
                :name="action.trailingIcon"
                size="20px"
                class="action-trailing-icon"
              />
            </SpaLink>
            <button
              v-else
              type="button"
              class="action-item"
              :class="getActionVariantClass(action)"
              :disabled="action.disabled === true"
              @click="handleActionClick(action)"
            >
              <q-icon :name="action.icon" size="20px" class="action-icon" />
              <div class="action-content">
                <div class="action-label">{{ action.label }}</div>
                <div v-if="action.description" class="action-description">
                  {{ action.description }}
                </div>
              </div>
              <q-icon
                v-if="action.trailingIcon !== undefined"
                :name="action.trailingIcon"
                size="20px"
                class="action-trailing-icon"
              />
            </button>
          </template>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import type { ContentAction } from "src/utils/actions/core/types";
import { watch } from "vue";

import SpaLink from "./SpaLink.vue";
import ZKBottomDialogContainer from "./ZKBottomDialogContainer.vue";
import ZKSwitch from "./ZKSwitch.vue";

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
  if (action.variant === "positive") {
    return "action-positive";
  }
  return "";
};

/**
 * Handle action click
 */
const handleActionClick = (action: ContentAction): void => {
  if (action.disabled === true) {
    return;
  }
  emit("actionSelected", action);
  if (action.closeOnSelect !== false) {
    showDialog.value = false;
  }
};

const handleNavigationClick = (action: ContentAction): void => {
  if (action.closeOnSelect !== false) {
    showDialog.value = false;
  }
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
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  background: transparent;
  text-align: start;
  @include hover-effects($hover-background-color);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.action-icon {
  flex-shrink: 0;
  color: $color-text-weak;
}

.action-trailing-icon {
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

.action-warning {
  .action-icon {
    color: #b7791f;
  }

  .action-label {
    color: #8a5a14;
  }
}

.action-positive {
  .action-icon {
    color: $positive;
  }

  .action-label {
    color: $positive;
  }
}
</style>
