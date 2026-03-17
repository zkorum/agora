<template>
  <!--
    This component has some form of VNode bug that can cause Vite's dev server
    to lose its rendering instance upon load. It only affects the development server.
    There are no solution to fix the issue but since it doesn't affect production
    it can be safely ignored.
  -->
  <div class="zk-phone-input" @click="handleCountrySearchFocus">
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
      :phone-input-attributes="{ name: 'phone', autocomplete: 'tel', inputmode: 'numeric', type: 'tel' }"
      @keydown.capture="(e: KeyboardEvent) => { if (e.key != null && e.key.length === 1 && !/[0-9+\-() ]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault() }"
      @data="handleUpdate"
      @country-code="handleCountryCode"
      @blur="handleBlur"
      @update:model-value="handleModelValue"
      @update:country-code="handleCountryCodeUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import "maz-ui/styles";

import type { CountryCode } from "libphonenumber-js/max";
import type { MazInputPhoneNumberData } from "maz-ui/components/MazInputPhoneNumber";
import MazInputPhoneNumber from "maz-ui/components/MazInputPhoneNumber";

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
  update: [results: MazInputPhoneNumberData];
  countryCode: [value: CountryCode | null | undefined];
  blur: [];
}>();

function handleSearchEnter(event: KeyboardEvent) {
  if (event.key === "Enter") {
    const firstOption = document.querySelector<HTMLButtonElement>(
      ".m-popover-panel .m-select-list-item"
    );
    if (firstOption) {
      firstOption.click();
    }
  }
}

function handleSearchScroll() {
  requestAnimationFrame(() => {
    const firstOption = document.querySelector<HTMLElement>(
      ".m-popover-panel .m-select-list-item"
    );
    if (firstOption) {
      firstOption.scrollIntoView({ block: "nearest" });
    }
  });
}

function handleCountrySearchFocus() {
  setTimeout(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      ".m-popover-panel .m-select-list__search-input input"
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.addEventListener("keydown", handleSearchEnter);
      searchInput.addEventListener("input", handleSearchScroll);
    }
  }, 100);
}

interface ZKPhoneNumberInputProps {
  modelValue: string | null;
  countryCode: CountryCode | null;
  success?: boolean;
  error?: boolean;
  showCodeOnList?: boolean;
  placeholder?: string;
  required?: boolean;
  autoFormat?: "blur" | "typing" | "disabled" | false;
  noValidationError?: boolean;
  ariaDescribedby?: string;
}

function handleModelValue(value: string | null) {
  emit("update:modelValue", value);
}

function handleCountryCodeUpdate(value: CountryCode | null) {
  emit("update:countryCode", value);
}

function handleUpdate(results: MazInputPhoneNumberData) {
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
:deep(.m-input-phone-number) {
  gap: 0.5rem;
}
</style>
