<template>
  <q-select
    :model-value="modelValue"
    outlined
    emit-value
    map-options
    :options="displayOptions"
    :label="label"
    :multiple="multiple"
    :use-chips="multiple"
    :clearable="clearable"
    :disable="disable"
    :loading="loading"
    :hide-bottom-space="hideBottomSpace"
    :use-input="searchable"
    :hide-selected="searchable && !multiple"
    :fill-input="searchable && !multiple"
    :input-debounce="searchable ? 0 : undefined"
    @update:model-value="emit('update:modelValue', $event)"
    @filter="handleFilter"
    @popup-hide="handlePopupHide"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface ZKSelectOption {
  label: string;
  value: string;
  disable?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | string[] | null;
    options: readonly ZKSelectOption[];
    label: string;
    multiple?: boolean;
    searchable?: boolean;
    clearable?: boolean;
    disable?: boolean;
    loading?: boolean;
    hideBottomSpace?: boolean;
  }>(),
  {
    multiple: false,
    searchable: false,
    clearable: false,
    disable: false,
    loading: false,
    hideBottomSpace: true,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: string | string[] | null];
}>();

const filteredOptions = ref<readonly ZKSelectOption[]>(props.options);

watch(
  () => props.options,
  (options) => {
    filteredOptions.value = options;
  },
  { immediate: true }
);

const displayOptions = computed(() => {
  return props.searchable ? filteredOptions.value : props.options;
});

function handleFilter(
  inputValue: string,
  doneFn: (callbackFn: () => void) => void
): void {
  if (!props.searchable) {
    doneFn(() => {
      filteredOptions.value = props.options;
    });
    return;
  }

  doneFn(() => {
    const needle = inputValue.trim().toLowerCase();

    filteredOptions.value =
      needle.length === 0
        ? props.options
        : props.options.filter((option) => {
            return option.label.toLowerCase().includes(needle);
          });
  });
}

function handlePopupHide(): void {
  filteredOptions.value = props.options;
}
</script>
