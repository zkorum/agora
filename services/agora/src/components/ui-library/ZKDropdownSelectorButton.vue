<template>
  <ZKButton
    :button-type="props.buttonType"
    :aria-label="props.accessibilityLabel"
    class="dropdown-selector-button"
    @click="emit('click')"
  >
    <div
      class="selector-content gradient-font"
      :class="{ 'selector-content--truncate': props.labelOverflow === 'truncate' }"
    >
      <span class="selector-label">{{ props.label }}</span>
      <q-icon
        :name="props.iconName"
        :size="props.iconSize"
        class="selector-icon gradient-font"
      />
    </div>
  </ZKButton>
</template>

<script setup lang="ts">
import ZKButton from "./ZKButton.vue";

const props = defineProps<{
  label: string;
  accessibilityLabel: string;
  buttonType: "standardButton" | "compactButton";
  iconName: string;
  iconSize: string;
  labelOverflow: "wrap" | "truncate";
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.gradient-font {
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}

.selector-content {
  display: flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  column-gap: 0.2rem;
  row-gap: 0.1rem;
  line-height: normal;
}

.selector-content--truncate {
  flex-wrap: nowrap;
  width: 100%;
  overflow: hidden;
}

.selector-label {
  min-width: 0;
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
  white-space: normal;
  text-align: center;
}

.selector-content--truncate .selector-label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  white-space: nowrap;
}

.selector-icon {
  flex-shrink: 0;
}

.dropdown-selector-button {
  min-width: 0;
  max-width: 100%;
}

.dropdown-selector-button :deep(.q-btn) {
  min-width: 0;
  max-width: 100%;
}

.dropdown-selector-button :deep(.q-btn__content) {
  min-width: 0;
  max-width: 100%;
  width: 100%;
}
</style>
