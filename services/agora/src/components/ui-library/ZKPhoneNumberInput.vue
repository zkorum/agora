<template>
  <!--
    This component has some form of VNode bug that can cause Vite's dev server
    to lose its rendering instance upon load. It only affects the development server.
    There are no solution to fix the issue but since it doesn't affect production
    it can be safely ignored.
  -->
  <!-- @vue-expect-error MazInputPhoneNumber types v-model as T | undefined -->
  <MazInputPhoneNumber
    :model-value="modelValue"
    :country-code="countryCode"
    :success="success"
    :error="error"
    :show-code-on-list="showCodeOnList"
    :placeholder="placeholder"
    :required="required"
    :auto-format="autoFormat"
    :no-validation-error="noValidationError"
    :aria-describedby="ariaDescribedby"
    @data="handleUpdate"
    @country-code="handleCountryCode"
    @blur="handleBlur"
    @update:model-value="handleModelValue"
    @update:country-code="handleCountryCodeUpdate"
  />
</template>

<script setup lang="ts">
import "maz-ui/styles";

import type { CountryCode } from "libphonenumber-js/max";
import type { Results } from "maz-ui/components/MazInputPhoneNumber";
import MazInputPhoneNumber from "maz-ui/components/MazInputPhoneNumber";

interface ZKPhoneNumberInputProps {
  modelValue: string | null;
  countryCode: CountryCode | null;
  success?: boolean;
  error?: boolean;
  showCodeOnList?: boolean;
  placeholder?: string;
  required?: boolean;
  autoFormat?: boolean;
  noValidationError?: boolean;
  ariaDescribedby?: string;
}

withDefaults(defineProps<ZKPhoneNumberInputProps>(), {
  success: false,
  error: false,
  showCodeOnList: false,
  placeholder: "",
  required: false,
  autoFormat: false,
  noValidationError: false,
  ariaDescribedby: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "update:countryCode": [value: CountryCode | null];
  update: [results: Results];
  countryCode: [value: CountryCode | null | undefined];
  blur: [];
}>();

function handleModelValue(value: string | null) {
  emit("update:modelValue", value);
}

function handleCountryCodeUpdate(value: CountryCode | null) {
  emit("update:countryCode", value);
}

function handleUpdate(results: Results) {
  emit("update", results);
}

function handleCountryCode(value: CountryCode | null | undefined) {
  emit("countryCode", value);
}

function handleBlur() {
  emit("blur");
}
</script>

<style scoped lang="scss">
:deep(.m-phone-number-input) {
  row-gap: 1rem;
}
</style>
