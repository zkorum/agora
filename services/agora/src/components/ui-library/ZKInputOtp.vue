<template>
  <InputOtp
    :model-value="modelValue"
    :length="length"
    :integer-only="integerOnly"
    :pt="{
      pcInputText: {
        root: {
          autocomplete: 'one-time-code',
        },
      },
    }"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
    @blur="emit('blur', $event)"
  />
</template>

<script setup lang="ts">
import InputOtp from "primevue/inputotp";

withDefaults(
  defineProps<{
    modelValue: string;
    length?: number;
    integerOnly?: boolean;
  }>(),
  {
    length: 6,
    integerOnly: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [event: { originalEvent: Event; value: string }];
  blur: [event: Event];
}>();
</script>
