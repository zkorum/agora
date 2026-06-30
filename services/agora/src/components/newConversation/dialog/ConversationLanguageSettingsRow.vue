<template>
  <div
    class="language-settings-row"
    :class="{
      'language-settings-row--clickable': props.clickable,
      'language-settings-row--disabled': props.disabled,
    }"
    :role="props.clickable && !props.disabled ? 'button' : undefined"
    :tabindex="props.clickable && !props.disabled ? 0 : undefined"
    :aria-disabled="props.disabled ? 'true' : undefined"
    @click="emitClick"
    @keydown.enter="handleActivationKey"
    @keydown.space="handleActivationKey"
  >
    <span class="language-settings-row__content">
      <span class="language-settings-row__title">{{ props.title }}</span>
      <span
        v-if="props.value !== undefined"
        class="language-settings-row__value"
      >
        {{ props.value }}
      </span>
      <span
        v-if="props.description !== undefined"
        class="language-settings-row__description"
      >
        {{ props.description }}
      </span>
    </span>

    <q-icon
      v-if="props.icon !== undefined"
      :name="props.icon"
      class="language-settings-row__icon"
    />

    <span
      v-if="$slots.actions"
      class="language-settings-row__actions"
      @click.stop
      @keydown.stop
    >
      <slot name="actions" />
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    value: string | undefined;
    description: string | undefined;
    icon: string | undefined;
    disabled: boolean;
    clickable?: boolean;
  }>(),
  { clickable: true }
);

const emit = defineEmits<{
  click: [];
}>();

function emitClick(): void {
  if (props.disabled || !props.clickable) {
    return;
  }

  emit("click");
}

function handleActivationKey(event: KeyboardEvent): void {
  if (props.disabled || !props.clickable) {
    return;
  }

  event.preventDefault();
  emit("click");
}
</script>

<style scoped lang="scss">
.language-settings-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 0;
  background: white;
  color: inherit;
  text-align: start;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
}

.language-settings-row--clickable {
  cursor: pointer;
}

.language-settings-row--disabled {
  cursor: not-allowed;
}

.language-settings-row__content {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
}

.language-settings-row__title {
  color: $color-text-strong;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
}

.language-settings-row__value,
.language-settings-row__description {
  color: $color-text-weak;
  font-size: 0.9rem;
  line-height: 1.3;
}

.language-settings-row__icon {
  flex-shrink: 0;
  color: $color-text-weak;
}

:slotted(.language-settings-row__icon) {
  flex-shrink: 0;
  color: $color-text-weak;
}

.language-settings-row__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}
</style>
