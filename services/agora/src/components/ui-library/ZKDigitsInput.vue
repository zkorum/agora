<template>
  <div @keydown.capture="handleKeydownCapture" @paste="handlePaste">
    <q-input
      :model-value="modelValue"
      outlined
      type="tel"
      autocomplete="off"
      :label="label"
      :placeholder="placeholder"
      :disable="disable"
      :error="error"
      :error-message="errorMessage"
      :hint="hint"
      :hide-bottom-space="hideBottomSpace"
      @update:model-value="handleModelValueUpdate"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    disable?: boolean;
    error?: boolean;
    errorMessage?: string;
    hint?: string;
    hideBottomSpace?: boolean;
  }>(),
  {
    label: "",
    placeholder: "",
    disable: false,
    error: false,
    errorMessage: "",
    hint: "",
    hideBottomSpace: false,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function stripToDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

function handleModelValueUpdate(value: string | number | null): void {
  emit("update:modelValue", stripToDigits(String(value ?? "")));
}

function handleKeydownCapture(event: KeyboardEvent): void {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.key.length !== 1
  ) {
    return;
  }

  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault();
  }
}

function handlePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData("text") ?? "";
  const digitsOnlyText = stripToDigits(pastedText);
  if (pastedText === digitsOnlyText) {
    return;
  }

  event.preventDefault();

  const input = event.target instanceof HTMLInputElement ? event.target : undefined;
  if (input === undefined) {
    emit("update:modelValue", digitsOnlyText);
    return;
  }

  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? input.value.length;
  const nextValue = `${input.value.slice(0, selectionStart)}${digitsOnlyText}${input.value.slice(selectionEnd)}`;
  emit("update:modelValue", stripToDigits(nextValue));
}
</script>
