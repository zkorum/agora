<template>
  <!--
    This component has some form of VNode bug that can cause Vite's dev server
    to lose its rendering instance upon load. It only affects the development server.
    There are no solution to fix the issue but since it doesn't affect production
    it can be safely ignored.
  -->
  <div
    class="zk-phone-input"
    @click="handleCountrySearchFocus"
    @keydown.capture="onKeydownCapture"
  >
    <MazInputPhoneNumber
      :model-value="phoneNumber ?? undefined"
      :country-code="countryCode ?? undefined"
      :success="success"
      :error="error"
      :show-code-in-list="showCodeInList"
      :placeholder="placeholder"
      :required="required"
      :auto-format="autoFormat"
      :validation-error="validationError"
      :aria-describedby="ariaDescribedby"
      :phone-input-attributes="{ name: 'phone', autocomplete: 'tel', inputmode: 'numeric', type: 'tel' }"
      @update:model-value="(v: string | null | undefined) => (phoneNumber = v ?? null)"
      @update:country-code="(v: CountryCode | null | undefined) => (countryCode = v ?? null)"
      @data="(results: MazInputPhoneNumberData) => props.onUpdate(results)"
      @country-code="(value: CountryCode | null | undefined) => props.onCountryCode(value ?? null)"
    />
  </div>
</template>

<script setup lang="ts">
import "maz-ui/styles";

import type { CountryCode } from "libphonenumber-js/max";
import type { MazInputPhoneNumberData } from "maz-ui/components/MazInputPhoneNumber";
import MazInputPhoneNumber from "maz-ui/components/MazInputPhoneNumber";

const props = withDefaults(
  defineProps<{
    success?: boolean;
    error?: boolean;
    showCodeInList?: boolean;
    placeholder?: string;
    required?: boolean;
    autoFormat?: "blur" | "typing" | "disabled" | false;
    validationError?: boolean;
    ariaDescribedby?: string;
    onUpdate: (results: MazInputPhoneNumberData) => void;
    onCountryCode: (value: CountryCode | null) => void;
    onKeydownEnter?: () => void;
  }>(),
  {
    success: false,
    error: false,
    showCodeInList: false,
    placeholder: "",
    required: false,
    autoFormat: false,
    validationError: false,
    ariaDescribedby: undefined,
    onKeydownEnter: undefined,
  },
);

const phoneNumber = defineModel<string | null>({ required: true });
const countryCode = defineModel<CountryCode | null>("countryCode", {
  required: true,
});

function onKeydownCapture(e: KeyboardEvent) {
  if (e.key === "Enter") {
    // Only trigger submit when Enter is pressed in the phone input,
    // not in the country search dropdown
    const target = e.target;
    if (target instanceof HTMLInputElement && target.name === "phone") {
      props.onKeydownEnter?.();
    }
    return;
  }
  if (
    e.key != null &&
    e.key.length === 1 &&
    !/[0-9+\-() ]/.test(e.key) &&
    !e.ctrlKey &&
    !e.metaKey
  ) {
    e.preventDefault();
  }
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
</script>

<style scoped lang="scss">
:deep(.m-input-phone-number) {
  gap: 0.5rem;
}
</style>
